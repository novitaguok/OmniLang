import { describe, expect, it } from 'vitest';

import { CatalogProductPhotoUseCase } from '../../src/application/use-cases/catalog-product-photo.js';
import { MerchantNotFoundError } from '../../src/application/errors.js';
import { InMemoryRepositories } from '../../src/infrastructure/persistence/in-memory-repositories.js';
import {
  FakeExchangeRateProvider,
  FakeMediaStore,
  FakeMerchantDirectory,
  FakeVisionCataloger,
  RecordingMessenger,
  makeMerchant,
} from '../support/fakes.js';
import type { ProductPhotoInput } from '../../src/application/ports/vision-cataloger.js';

const PHOTO: ProductPhotoInput = { data: Buffer.from('fake-jpeg-bytes'), mimeType: 'image/jpeg' };

function makeUseCase(merchantRegistered = true) {
  const repositories = new InMemoryRepositories();
  const merchants = new FakeMerchantDirectory(merchantRegistered ? [makeMerchant()] : []);
  const messenger = new RecordingMessenger();
  const visionCataloger = new FakeVisionCataloger();
  const useCase = new CatalogProductPhotoUseCase({
    merchants,
    visionCataloger,
    mediaStore: new FakeMediaStore(),
    exchangeRates: new FakeExchangeRateProvider({ USD: 0.000064, JPY: 0.01, SGD: 0.000084 }),
    listings: repositories,
    messenger,
    catalogBaseUrl: 'https://omnilang.example.com',
  });
  return { useCase, repositories, messenger, visionCataloger, merchantAddress: '6281234567890' };
}

describe('CatalogProductPhotoUseCase', () => {
  it('turns a photo + colloquial note into a published listing with currency conversions', async () => {
    const { useCase, repositories, messenger, merchantAddress } = makeUseCase();

    const listing = await useCase.execute({
      merchantId: 'm-001',
      channel: 'whatsapp',
      photo: PHOTO,
      merchantNote: 'Ini keranjang rotan asli, mau jual 75rb per buah',
    });

    expect(listing).not.toBeNull();
    expect(listing!.status).toBe('published');
    expect(listing!.basePrice.amount).toBe(75_000);
    expect(listing!.basePrice.currency).toBe('IDR');
    expect(listing!.priceConversions.map((price) => [price.currency, price.amount])).toEqual([
      ['USD', 5],
      ['JPY', 750],
      ['SGD', 6],
    ]);
    await expect(repositories.findById(listing!.id)).resolves.toMatchObject({ title: listing!.title });

    const preview = messenger.textsTo(merchantAddress)[0];
    expect(preview).toContain('Handcrafted Boho Rattan Basket');
    expect(preview).toContain('omnilang.example.com/p/' + listing!.id);
    expect(preview).toContain('$5.00');
  });

  it('asks for a price when the note contains none', async () => {
    const { useCase, repositories, messenger, merchantAddress } = makeUseCase();

    const listing = await useCase.execute({
      merchantId: 'm-001',
      channel: 'whatsapp',
      photo: PHOTO,
      merchantNote: 'ini keranjang buatan saya',
    });

    expect(listing).toBeNull();
    await expect(repositories.listByMerchant('m-001')).resolves.toHaveLength(0);
    expect(messenger.textsTo(merchantAddress)[0]).toMatch(/price/i);
  });

  it('throws for an unknown merchant', async () => {
    const { useCase } = makeUseCase(false);
    await expect(
      useCase.execute({ merchantId: 'ghost', channel: 'whatsapp', photo: PHOTO, merchantNote: '75rb' }),
    ).rejects.toThrow(MerchantNotFoundError);
  });
});
