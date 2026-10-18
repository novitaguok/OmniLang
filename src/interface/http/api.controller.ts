import type { Request, Response } from 'express';

import { ListingNotFoundError } from '../../application/errors.js';
import { assertCurrencyCode } from '../../domain/value-objects/money.js';
import { Money } from '../../domain/value-objects/money.js';
import type { CloseDealUseCase } from '../../application/use-cases/close-deal.js';
import type { CatalogProductPhotoUseCase } from '../../application/use-cases/catalog-product-photo.js';
import type { ListingRepository } from '../../application/ports/listing-repository.js';
import type { NegotiationRepository } from '../../application/ports/negotiation-repository.js';
import { closeDealBodySchema, createListingBodySchema } from './middleware.js';

export interface ApiControllerDeps {
  readonly listings: ListingRepository;
  readonly negotiations: NegotiationRepository;
  readonly closeDeal: CloseDealUseCase;
  readonly catalogProductPhoto: CatalogProductPhotoUseCase;
}

/**
 * Merchant/dashboard-facing REST surface:
 *   GET    /catalog/:listingId                      -> public listing JSON
 *   POST   /api/merchants/:id/listings               -> photo-to-catalog (API entry)
 *   GET    /api/merchants/:id/negotiations          -> negotiation summaries
 *   POST   /api/negotiations/:id/close-deal          -> freeze the deal, issue the invoice
 */
export class ApiController {
  constructor(private readonly deps: ApiControllerDeps) {}

  async getListing(req: Request<{ listingId: string }>, res: Response): Promise<void> {
    const listing = await this.deps.listings.findById(req.params.listingId);
    if (!listing) {
      throw new ListingNotFoundError(req.params.listingId);
    }
    res.status(200).json(listing.toSnapshot());
  }

  async createListing(req: Request<{ merchantId: string }>, res: Response): Promise<void> {
    const body = createListingBodySchema.parse(req.body);

    const listing = await this.deps.catalogProductPhoto.execute({
      merchantId: req.params.merchantId,
      photo: {
        data: Buffer.from(body.imageBase64, 'base64'),
        mimeType: body.mimeType ?? 'image/jpeg',
      },
      merchantNote: body.note,
    });

    if (!listing) {
      res.status(422).json({ error: 'No price found in the note — the merchant was asked to resend with a price' });
      return;
    }
    res.status(201).json(listing.toSnapshot());
  }

  async listNegotiations(req: Request<{ merchantId: string }>, res: Response): Promise<void> {
    const negotiations = await this.deps.negotiations.listNegotiationsByMerchant(req.params.merchantId);
    res.status(200).json(
      negotiations.map((negotiation) => ({
        id: negotiation.id,
        stage: negotiation.stage,
        channel: negotiation.channel,
        buyerAddress: negotiation.buyerAddress,
        buyerLanguage: negotiation.buyerLanguage,
        listingId: negotiation.listingId,
        turns: negotiation.transcript.length,
        updatedAt: negotiation.updatedAt.toISOString(),
      })),
    );
  }

  async closeDeal(req: Request<{ negotiationId: string }>, res: Response): Promise<void> {
    const body = closeDealBodySchema.parse(req.body);
    const unitPrice = Money.of(body.unitPriceAmount, assertCurrencyCode(body.unitPriceCurrency));
    const shippingCost = Money.of(body.shippingCostAmount, unitPrice.currency);

    const order = await this.deps.closeDeal.execute({
      negotiationId: req.params.negotiationId,
      quantity: body.quantity,
      unitPrice,
      shippingCost,
    });

    res.status(201).json({
      orderId: order.id,
      negotiationId: order.negotiationId,
      quantity: order.quantity,
      total: { amount: order.total.amount, currency: order.total.currency },
      invoiceId: order.invoiceId,
      paymentUrl: order.paymentUrl,
    });
  }
}
