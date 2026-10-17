import type { Request, Response } from 'express';

import { ListingNotFoundError } from '../../application/errors.js';
import { assertCurrencyCode } from '../../domain/value-objects/money.js';
import { Money } from '../../domain/value-objects/money.js';
import type { CloseDealUseCase } from '../../application/use-cases/close-deal.js';
import type { ListingRepository } from '../../application/ports/listing-repository.js';
import { closeDealBodySchema } from './middleware.js';

export interface ApiControllerDeps {
  readonly listings: ListingRepository;
  readonly closeDeal: CloseDealUseCase;
}

/**
 * Merchant/dashboards-facing REST surface:
 *   GET  /catalog/:listingId              -> public listing JSON
 *   POST /api/negotiations/:id/close-deal -> freeze the deal, issue the invoice
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
