import type { InvoiceInput, IssuedInvoice, PaymentProvider } from '../../application/ports/payment-provider.js';
import { randomUUID } from 'node:crypto';

/**
 * Demo-mode payment provider: issues deterministic mock invoice links so
 * the negotiation-to-invoice flow completes without a real gateway.
 */
export class DemoPaymentProvider implements PaymentProvider {
  constructor(private readonly baseUrl: string) {}

  async createInvoice(input: InvoiceInput): Promise<IssuedInvoice> {
    const invoiceId = `demo-inv-${randomUUID()}`;
    return {
      invoiceId,
      paymentUrl: `${this.baseUrl.replace(/\/$/, '')}/pay/${invoiceId}`,
    };
  }
}
