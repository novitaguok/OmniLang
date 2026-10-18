import { describe, expect, it } from 'vitest';

import { CloseDealUseCase } from '../../src/application/use-cases/close-deal.js';
import { Negotiation } from '../../src/domain/entities/negotiation.js';
import { Money } from '../../src/domain/value-objects/money.js';
import { ApplicationError, NegotiationNotFoundError } from '../../src/application/errors.js';
import type { NegotiationRepository } from '../../src/application/ports/negotiation-repository.js';
import { InMemoryRepositories } from '../../src/infrastructure/persistence/in-memory-repositories.js';
import { FakeMerchantDirectory, FakePaymentProvider, FakeTranslator, RecordingMessenger, makeMerchant } from '../support/fakes.js';

const MERCHANT = makeMerchant();
const BUYER_ADDRESS = '819012345678';

async function makeUseCase() {
  const repositories = new InMemoryRepositories();
  const negotiation = Negotiation.open({
    id: 'n-001',
    channel: 'whatsapp',
    merchantId: MERCHANT.id,
    merchantAddress: MERCHANT.channelAddress,
    merchantLanguage: 'id',
    buyerAddress: BUYER_ADDRESS,
    buyerLanguage: 'ja',
    listingId: null,
  });
  negotiation.recordTurn('buyer', '5個購入希望です', 'Mau beli 5');
  negotiation.advanceTo('OFFER');
  await repositories.save(negotiation);

  const messenger = new RecordingMessenger();
  const translator = new FakeTranslator();
  const payments = new FakePaymentProvider();
  const useCase = new CloseDealUseCase({
    negotiations: repositories,
    orders: repositories,
    listings: repositories,
    payments,
    translator,
    messenger,
  });
  return { useCase, repositories, messenger, payments };
}

describe('CloseDealUseCase', () => {
  it('freezes the deal, invoices it and notifies both sides in their language', async () => {
    const { useCase, repositories, messenger, payments } = await makeUseCase();

    const order = await useCase.execute({
      negotiationId: 'n-001',
      quantity: 5,
      unitPrice: Money.of(75_000, 'IDR'),
      shippingCost: Money.of(120_000, 'IDR'),
    });

    expect(order.total.amount).toBe(495_000);
    expect(order.invoiceId).toBe('inv-123');
    expect(payments.invoices).toHaveLength(1);
    expect(payments.invoices[0]!.amount.amount).toBe(495_000);

    const negotiation = await (repositories as NegotiationRepository).findById('n-001');
    expect(negotiation).toBeInstanceOf(Negotiation);
    expect(negotiation!.stage).toBe('INVOICED');

    const toBuyer = messenger.textsTo(BUYER_ADDRESS)[0];
    expect(toBuyer).toContain('[en->ja]');
    expect(toBuyer).toContain('https://pay.example.com/inv-123');
    const toMerchant = messenger.textsTo(MERCHANT.channelAddress)[0];
    expect(toMerchant).toContain('[en->id]');
    expect(toMerchant).toContain('495,000');
  });

  it('refuses to close an already-invoiced negotiation', async () => {
    const { useCase } = await makeUseCase();

    await useCase.execute({
      negotiationId: 'n-001',
      quantity: 1,
      unitPrice: Money.of(75_000, 'IDR'),
      shippingCost: Money.zero('IDR'),
    });

    await expect(
      useCase.execute({
        negotiationId: 'n-001',
        quantity: 1,
        unitPrice: Money.of(75_000, 'IDR'),
        shippingCost: Money.zero('IDR'),
      }),
    ).rejects.toThrow(ApplicationError);
  });

  it('fails loudly for an unknown negotiation', async () => {
    const { useCase } = await makeUseCase();
    await expect(
      useCase.execute({ negotiationId: 'ghost', quantity: 1, unitPrice: Money.of(1, 'IDR'), shippingCost: Money.zero('IDR') }),
    ).rejects.toThrow(NegotiationNotFoundError);
  });
});
