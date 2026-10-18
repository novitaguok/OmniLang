import { DomainError, ValidationError } from '../errors.js';
import { Money } from '../value-objects/money.js';
import type { Channel } from '../value-objects/channel.js';
import type { LanguageCode } from '../value-objects/language.js';

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';

export interface OrderProps {
  readonly id: string;
  readonly listingId: string | null;
  readonly negotiationId: string;
  readonly merchantId: string;
  readonly buyerAddress: string;
  readonly channel: Channel;
  readonly buyerLanguage: LanguageCode;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly shippingCost: Money;
  readonly status: OrderStatus;
  invoiceId: string | null;
  paymentUrl: string | null;
  readonly createdAt: Date;
}

const MAX_QUANTITY = 100_000;

/**
 * A digital order closed from an accepted chat negotiation, carrying the
 * cross-border payment link once the payment provider issues an invoice.
 */
export class Order {
  private readonly props: OrderProps;

  private constructor(props: OrderProps) {
    this.props = props;
  }

  static place(input: Omit<OrderProps, 'status' | 'invoiceId' | 'paymentUrl' | 'createdAt'> & { createdAt?: Date }): Order {
    if (!input.id.trim()) {
      throw new ValidationError('Order id is required');
    }
    if (!input.negotiationId.trim()) {
      throw new ValidationError('Order negotiationId is required');
    }
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new ValidationError(`Order quantity must be a positive integer, got '${input.quantity}'`);
    }
    if (input.quantity > MAX_QUANTITY) {
      throw new ValidationError(`Order quantity must be at most ${MAX_QUANTITY}`);
    }
    if (input.unitPrice.currency !== input.shippingCost.currency) {
      throw new DomainError(
        `Unit price (${input.unitPrice.currency}) and shipping cost (${input.shippingCost.currency}) must share a currency`,
      );
    }
    return new Order({
      ...input,
      status: 'PENDING_PAYMENT',
      invoiceId: null,
      paymentUrl: null,
      createdAt: input.createdAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get listingId(): string | null {
    return this.props.listingId;
  }

  get negotiationId(): string {
    return this.props.negotiationId;
  }

  get merchantId(): string {
    return this.props.merchantId;
  }

  get buyerAddress(): string {
    return this.props.buyerAddress;
  }

  get channel(): Channel {
    return this.props.channel;
  }

  get buyerLanguage(): LanguageCode {
    return this.props.buyerLanguage;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPrice(): Money {
    return this.props.unitPrice;
  }

  get shippingCost(): Money {
    return this.props.shippingCost;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get paymentUrl(): string | null {
    return this.props.paymentUrl;
  }

  get invoiceId(): string | null {
    return this.props.invoiceId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** quantity × unit price + shipping, in the deal currency. */
  get total(): Money {
    return this.props.unitPrice.multiply(this.props.quantity).add(this.props.shippingCost);
  }

  /** Attach the invoice issued by the payment provider (once). */
  attachInvoice(invoiceId: string, paymentUrl: string): void {
    if (this.props.invoiceId || this.props.paymentUrl) {
      throw new DomainError(`Order '${this.props.id}' already carries an invoice`);
    }
    if (this.props.status !== 'PENDING_PAYMENT') {
      throw new DomainError(`Cannot attach an invoice to an order in status '${this.props.status}'`);
    }
    if (!invoiceId.trim() || !paymentUrl.trim()) {
      throw new ValidationError('Invoice id and payment url are required');
    }
    this.props.invoiceId = invoiceId;
    this.props.paymentUrl = paymentUrl;
  }

  toSnapshot(): Record<string, unknown> {
    return {
      id: this.props.id,
      listingId: this.props.listingId,
      negotiationId: this.props.negotiationId,
      merchantId: this.props.merchantId,
      buyerAddress: this.props.buyerAddress,
      channel: this.props.channel,
      buyerLanguage: this.props.buyerLanguage,
      quantity: this.props.quantity,
      unitPrice: { amount: this.props.unitPrice.amount, currency: this.props.unitPrice.currency },
      shippingCost: { amount: this.props.shippingCost.amount, currency: this.props.shippingCost.currency },
      status: this.props.status,
      invoiceId: this.props.invoiceId,
      paymentUrl: this.props.paymentUrl,
      createdAt: this.props.createdAt.toISOString(),
    };
  }

  static fromSnapshot(snapshot: Record<string, unknown>): Order {
    const s = snapshot as {
      id: string;
      listingId: string | null;
      negotiationId: string;
      merchantId: string;
      buyerAddress: string;
      channel: Channel;
      buyerLanguage: LanguageCode;
      quantity: number;
      unitPrice: { amount: number; currency: Parameters<typeof Money.of>[1] };
      shippingCost: { amount: number; currency: Parameters<typeof Money.of>[1] };
      status: OrderStatus;
      invoiceId: string | null;
      paymentUrl: string | null;
      createdAt: string;
    };
    return new Order({
      id: s.id,
      listingId: s.listingId,
      negotiationId: s.negotiationId,
      merchantId: s.merchantId,
      buyerAddress: s.buyerAddress,
      channel: s.channel,
      buyerLanguage: s.buyerLanguage,
      quantity: s.quantity,
      unitPrice: Money.of(s.unitPrice.amount, s.unitPrice.currency),
      shippingCost: Money.of(s.shippingCost.amount, s.shippingCost.currency),
      status: s.status,
      invoiceId: s.invoiceId,
      paymentUrl: s.paymentUrl,
      createdAt: new Date(s.createdAt),
    });
  }
}
