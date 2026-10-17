import type { InvoiceInput, IssuedInvoice, PaymentProvider } from '../../application/ports/payment-provider.js';
import { InfrastructureError } from '../errors.js';

/**
 * Payment adapter for a generic invoice gateway:
 *   POST {apiUrl}/invoices  { orderId, description, amount, currency }
 *   ->  { invoiceId, paymentUrl }
 * Keeps the agent provider-agnostic (Stripe, Xendit, Midtrans, ... all fit).
 */
export class HttpPaymentProvider implements PaymentProvider {
  constructor(private readonly apiUrl: string) {}

  async createInvoice(input: InvoiceInput): Promise<IssuedInvoice> {
    let response: Response;
    try {
      response = await fetch(`${this.apiUrl.replace(/\/$/, '')}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: input.orderId,
          description: input.description,
          amount: input.amount.amount,
          currency: input.amount.currency,
        }),
      });
    } catch (error) {
      throw new InfrastructureError('Payment gateway is unreachable', error);
    }
    if (!response.ok) {
      const body = await response.text();
      throw new InfrastructureError(`Payment gateway rejected invoice creation (${response.status}): ${body}`);
    }
    const payload = (await response.json()) as Partial<IssuedInvoice>;
    if (!payload.invoiceId || !payload.paymentUrl) {
      throw new InfrastructureError('Payment gateway response is missing invoiceId/paymentUrl');
    }
    return { invoiceId: payload.invoiceId, paymentUrl: payload.paymentUrl };
  }
}
