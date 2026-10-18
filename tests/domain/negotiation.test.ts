import { describe, expect, it } from 'vitest';

import { Negotiation, type NegotiationTurn } from '../../src/domain/entities/negotiation.js';
import { InvalidTransitionError } from '../../src/domain/errors.js';

function openNegotiation() {
  return Negotiation.open({
    id: 'n-001',
    channel: 'whatsapp',
    merchantId: 'm-001',
    merchantAddress: '6281234567890',
    merchantLanguage: 'id',
    buyerAddress: '819012345678',
    buyerLanguage: 'ja',
    listingId: 'l-001',
  });
}

describe('Negotiation', () => {
  it('opens in the INQUIRY stage', () => {
    const negotiation = openNegotiation();
    expect(negotiation.stage).toBe('INQUIRY');
    expect(negotiation.transcript).toHaveLength(0);
  });

  it('records turns and keeps the transcript immutable to callers', () => {
    const negotiation = openNegotiation();
    negotiation.recordTurn('buyer', '5個購入希望です。東京までの送料は？', 'Mau beli 5 pcs, ongkir ke Tokyo berapa?');
    negotiation.recordTurn('merchant', 'Bisa, ongkir sekitar 120rb', 'Sure, shipping is about 120,000 IDR');

    expect(negotiation.transcript).toHaveLength(2);
    expect(negotiation.transcript[0]?.role).toBe('buyer');
    expect(negotiation.transcript[0]?.translated).toContain('ongkir');

    // the exposed transcript is a defensive copy — mutating it cannot alter the negotiation
    (negotiation.transcript as NegotiationTurn[]).push({
      role: 'merchant',
      text: 'forged',
      translated: 'forged',
      sentAt: new Date(),
    });
    expect(negotiation.transcript).toHaveLength(2);
  });

  it('rejects empty turn text', () => {
    const negotiation = openNegotiation();
    expect(() => negotiation.recordTurn('buyer', '   ', 'translation')).toThrow();
  });

  it('enforces the state machine transitions', () => {
    const negotiation = openNegotiation();
    negotiation.advanceTo('OFFER');
    negotiation.advanceTo('OFFER'); // counter-offer loop
    negotiation.advanceTo('SHIPPING');

    expect(() => negotiation.advanceTo('OFFER')).toThrow(InvalidTransitionError);
    expect(() => negotiation.advanceTo('PAID')).toThrow(InvalidTransitionError);
  });

  it('walks to INVOICED in one call and refuses after PAID', () => {
    const negotiation = openNegotiation();
    negotiation.markInvoiced();
    expect(negotiation.stage).toBe('INVOICED');
    negotiation.advanceTo('PAID');
    expect(() => negotiation.markInvoiced()).toThrow(InvalidTransitionError);
  });

  it('round-trips through a snapshot', () => {
    const negotiation = openNegotiation();
    negotiation.recordTurn('buyer', 'konnichiwa', 'selamat siang');
    const restored = Negotiation.fromSnapshot(JSON.parse(JSON.stringify(negotiation.toSnapshot())));

    expect(restored.id).toBe(negotiation.id);
    expect(restored.stage).toBe(negotiation.stage);
    expect(restored.transcript[0]?.text).toBe('konnichiwa');
    expect(restored.transcript[0]?.sentAt).toBeInstanceOf(Date);
  });
});
