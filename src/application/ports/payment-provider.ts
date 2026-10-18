import type { Money } from '../../domain/value-objects/money.js';

export interface InvoiceInput {
  readonly orderId: string;
  readonly description: string;
  readonly amount: Money;
}

export interface IssuedInvoice {
  readonly invoiceId: string;
  readonly paymentUrl: string;
}

/**
 * Port: creates cross-border payment links (e-wallets, cards) for a
 * closed deal.
 */
export interface PaymentProvider {
  createInvoice(input: InvoiceInput): Promise<IssuedInvoice>;
}
