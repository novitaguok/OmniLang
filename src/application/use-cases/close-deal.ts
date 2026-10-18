import { randomUUID } from 'node:crypto';

import { Order } from '../../domain/entities/order.js';
import type { Money } from '../../domain/value-objects/money.js';
import { ApplicationError, NegotiationNotFoundError } from '../errors.js';
import type { ChannelMessenger } from '../ports/channel-messenger.js';
import type { DialectTranslator } from '../ports/dialect-translator.js';
import type { ListingRepository } from '../ports/listing-repository.js';
import type { NegotiationRepository } from '../ports/negotiation-repository.js';
import type { OrderRepository } from '../ports/order-repository.js';
import type { PaymentProvider } from '../ports/payment-provider.js';

export interface CloseDealInput {
  readonly negotiationId: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly shippingCost: Money;
}

export interface CloseDealDeps {
  readonly negotiations: NegotiationRepository;
  readonly orders: OrderRepository;
  readonly listings: ListingRepository;
  readonly payments: PaymentProvider;
  readonly translator: DialectTranslator;
  readonly messenger: ChannelMessenger;
}

/**
 * Use case 3 — Automated Order Closing & Invoicing.
 *
 * Converts an accepted chat negotiation into a clean digital order:
 *   1. freezes the agreed quantity, unit price and shipping cost,
 *   2. advances the negotiation to INVOICED,
 *   3. issues a cross-border payment link via the payment provider,
 *   4. delivers a translated invoice summary to the buyer and a
 *      confirmation to the merchant.
 */
export class CloseDealUseCase {
  constructor(private readonly deps: CloseDealDeps) {}

  async execute(input: CloseDealInput): Promise<Order> {
    const negotiation = await this.deps.negotiations.findById(input.negotiationId);
    if (!negotiation) {
      throw new NegotiationNotFoundError(input.negotiationId);
    }
    if (negotiation.stage === 'INVOICED' || negotiation.stage === 'PAID') {
      throw new ApplicationError(`Negotiation '${negotiation.id}' is already closed`);
    }

    const listing = negotiation.listingId ? await this.deps.listings.findById(negotiation.listingId) : null;
    const order = Order.place({
      id: randomUUID(),
      listingId: negotiation.listingId,
      negotiationId: negotiation.id,
      merchantId: negotiation.merchantId,
      buyerAddress: negotiation.buyerAddress,
      channel: negotiation.channel,
      buyerLanguage: negotiation.buyerLanguage,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      shippingCost: input.shippingCost,
    });

    const invoice = await this.deps.payments.createInvoice({
      orderId: order.id,
      description: listing ? `${input.quantity} × ${listing.title}` : 'OmniLang cross-border order',
      amount: order.total,
    });
    order.attachInvoice(invoice.invoiceId, invoice.paymentUrl);

    negotiation.markInvoiced();
    await this.deps.negotiations.save(negotiation);
    await this.deps.orders.save(order);

    const productLabel = listing ? listing.title : 'your order';
    const buyerSummary =
      `Order confirmed! ${input.quantity} × ${productLabel}\n` +
      `Unit price: ${input.unitPrice.format()} ${input.unitPrice.currency}\n` +
      `Shipping: ${input.shippingCost.format()} ${input.shippingCost.currency}\n` +
      `Total: ${order.total.format()} ${order.total.currency}\n` +
      `Pay securely: ${invoice.paymentUrl}`;
    const buyerMessage = await this.deps.translator.translate(
      buyerSummary,
      'en',
      negotiation.buyerLanguage,
    );
    await this.deps.messenger.send({ channel: negotiation.channel, to: negotiation.buyerAddress, text: buyerMessage });

    const merchantSummary =
      `A new order just closed! Here are the details:\n` +
      `${input.quantity} × ${productLabel}\n` +
      `Unit price: ${input.unitPrice.format()} ${input.unitPrice.currency}\n` +
      `Shipping: ${input.shippingCost.format()} ${input.shippingCost.currency}\n` +
      `Buyer invoice total: ${order.total.format()} ${order.total.currency}\n` +
      `The payment link has been sent to the buyer: ${invoice.paymentUrl}`;
    const merchantMessage = await this.deps.translator.translate(
      merchantSummary,
      'en',
      negotiation.merchantLanguage,
    );
    await this.deps.messenger.send({
      channel: negotiation.channel,
      to: negotiation.merchantAddress,
      text: merchantMessage,
    });

    return order;
  }
}
