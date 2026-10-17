import { describe, expect, it } from 'vitest';

import { RelayChatMessageUseCase } from '../../src/application/use-cases/relay-chat-message.js';
import { Listing } from '../../src/domain/entities/listing.js';
import { Money } from '../../src/domain/value-objects/money.js';
import { InMemoryRepositories } from '../../src/infrastructure/persistence/in-memory-repositories.js';
import { RATTAN_BASKET_ANALYSIS, makeMerchant } from '../support/fakes.js';
import { FakeMerchantDirectory, FakeTranslator, RecordingMessenger } from '../support/fakes.js';

const MERCHANT = makeMerchant();
const MERCHANT_ADDRESS = MERCHANT.channelAddress;
const BUYER_ADDRESS = '819012345678';

function makeUseCase(listing: Listing | null = null) {
  const repositories = new InMemoryRepositories();
  if (listing) {
    listing.publish();
    void repositories.save(listing);
  }
  const merchants = new FakeMerchantDirectory([MERCHANT]);
  const messenger = new RecordingMessenger();
  const translator = new FakeTranslator();
  const useCase = new RelayChatMessageUseCase({ merchants, negotiations: repositories, listings: repositories, translator, messenger });
  return { useCase, repositories, messenger, translator };
}

function makeListing() {
  return Listing.create({
    id: 'l-001',
    merchantId: MERCHANT.id,
    photoUrl: 'https://media.example.com/photo.jpg',
    title: RATTAN_BASKET_ANALYSIS.title,
    description: RATTAN_BASKET_ANALYSIS.description,
    tags: RATTAN_BASKET_ANALYSIS.tags,
    materials: RATTAN_BASKET_ANALYSIS.materials,
    colors: RATTAN_BASKET_ANALYSIS.colors,
    craftsmanshipNotes: null,
    careInstructions: null,
    estimatedDimensions: null,
    basePrice: Money.of(75_000, 'IDR'),
    priceConversions: [Money.of(5, 'USD')],
  });
}

describe('RelayChatMessageUseCase', () => {
  it('opens a negotiation for a new buyer messaging the merchant number, translating into the merchant dialect', async () => {
    const { useCase, repositories, messenger } = makeUseCase();

    await useCase.execute({
      channel: 'whatsapp',
      senderAddress: BUYER_ADDRESS,
      text: '5個購入希望です。東京までの送料は？',
      merchantAddress: MERCHANT_ADDRESS,
    });

    const negotiation = await repositories.findActiveByBuyer('whatsapp', BUYER_ADDRESS);
    expect(negotiation).not.toBeNull();
    expect(negotiation!.buyerLanguage).toBe('ja');
    expect(negotiation!.merchantLanguage).toBe('id');

    const relayed = messenger.textsTo(MERCHANT_ADDRESS)[0];
    expect(relayed).toBe('[ja->id] 5個購入希望です。東京までの送料は？');
    expect(negotiation!.transcript).toHaveLength(1);
    expect(negotiation!.transcript[0]?.text).toContain('送料');
  });

  it('relays the merchant reply back to the active buyer in their language', async () => {
    const { useCase, messenger } = makeUseCase();

    await useCase.execute({ channel: 'whatsapp', senderAddress: BUYER_ADDRESS, text: 'hello', merchantAddress: MERCHANT_ADDRESS });
    await useCase.execute({ channel: 'whatsapp', senderAddress: MERCHANT_ADDRESS, text: 'Bisa, ongkir sekitar 120rb' });

    const toBuyer = messenger.textsTo(BUYER_ADDRESS);
    expect(toBuyer[toBuyer.length - 1]).toBe('[id->ja] Bisa, ongkir sekitar 120rb');
  });

  it('keeps a single negotiation alive across turns (context preservation)', async () => {
    const { useCase, repositories } = makeUseCase();

    await useCase.execute({ channel: 'whatsapp', senderAddress: BUYER_ADDRESS, text: 'hello', merchantAddress: MERCHANT_ADDRESS });
    await useCase.execute({ channel: 'whatsapp', senderAddress: BUYER_ADDRESS, text: 'how much?' });

    const negotiation = await repositories.findActiveByBuyer('whatsapp', BUYER_ADDRESS);
    expect(negotiation!.transcript).toHaveLength(2);
    expect(negotiation!.transcript.every((turn) => turn.role === 'buyer')).toBe(true);
  });

  it('tells a merchant with no active buyer conversation so', async () => {
    const { useCase, messenger } = makeUseCase();

    await useCase.execute({ channel: 'whatsapp', senderAddress: MERCHANT_ADDRESS, text: 'halo' });

    expect(messenger.textsTo(MERCHANT_ADDRESS)[0]).toMatch(/no active buyer conversation/i);
  });

  it('guides buyers that cannot be tied to any shop', async () => {
    const { useCase, messenger } = makeUseCase();

    await useCase.execute({ channel: 'whatsapp', senderAddress: '999', text: 'hi' });

    expect(messenger.textsTo('999')[0]).toMatch(/OmniLang commerce agent/i);
  });
});
