import { describe, expect, it } from 'vitest';

import { Order } from '../../src/domain/entities/order.js';
import { Money } from '../../src/domain/value-objects/money.js';
import { DomainError } from '../../src/domain/errors.js';

function placeOrder(overrides: Partial<Parameters<typeof Order.place>[0]> = {}) {
  return Order.place({
    id: 'o-001',
    listingId: 'l-001',
    negotiationId: 'n-001',
    merchantId: 'm-001',
    buyerAddress: '819012345678',
    channel: 'whatsapp',
    buyerLanguage: 'ja',
    quantity: 5,
    unitPrice: Money.of(75_000, 'IDR'),
    shippingCost: Money.of(120_000, 'IDR'),
    ...overrides,
  });
}

describe('Order', () => {
  it('places a pending-payment order and computes the total', () => {
    const order = placeOrder();
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.total.amount).toBe(5 * 75_000 + 120_000);
  });

  it('rejects invalid quantities and mixed currencies', () => {
    expect(() => placeOrder({ quantity: 0 })).toThrow();
    expect(() => placeOrder({ quantity: 2.5 })).toThrow();
    expect(() => placeOrder({ shippingCost: Money.of(5, 'USD') })).toThrow(DomainError);
  });

  it('attaches an invoice once and locks afterwards', () => {
    const order = placeOrder();
    order.attachInvoice('inv-9', 'https://pay.example.com/inv-9');
    expect(order.invoiceId).toBe('inv-9');
    expect(order.paymentUrl).toBe('https://pay.example.com/inv-9');
    expect(() => order.attachInvoice('inv-10', 'https://pay.example.com/inv-10')).toThrow();
  });

  it('round-trips through a snapshot', () => {
    const order = placeOrder();
    order.attachInvoice('inv-9', 'https://pay.example.com/inv-9');
    const restored = Order.fromSnapshot(JSON.parse(JSON.stringify(order.toSnapshot())));

    expect(restored.id).toBe(order.id);
    expect(restored.invoiceId).toBe('inv-9');
    expect(restored.total.amount).toBe(order.total.amount);
  });
});
