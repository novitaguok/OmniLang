import type { Merchant } from '../../src/domain/entities/merchant.js';
import { Merchant as MerchantEntity } from '../../src/domain/entities/merchant.js';
import type { Channel } from '../../src/domain/value-objects/channel.js';
import type { MerchantDirectory } from '../../src/application/ports/merchant-directory.js';
import type { OutboundMessage } from '../../src/application/ports/channel-messenger.js';
import type { CatalogAnalysis, ProductPhotoInput, VisionCataloger } from '../../src/application/ports/vision-cataloger.js';
import type { MediaStore, StoredMedia } from '../../src/application/ports/media-store.js';
import type { ExchangeRateProvider } from '../../src/application/ports/exchange-rate-provider.js';
import type { DialectTranslator } from '../../src/application/ports/dialect-translator.js';
import type { InvoiceInput, IssuedInvoice, PaymentProvider } from '../../src/application/ports/payment-provider.js';
import type { LanguageCode } from '../../src/domain/value-objects/language.js';
import type { CurrencyCode } from '../../src/domain/value-objects/money.js';
import { InMemoryRepositories } from '../../src/infrastructure/persistence/in-memory-repositories.js';

export const RATTAN_BASKET_ANALYSIS: CatalogAnalysis = {
  title: 'Handcrafted Boho Rattan Basket (Organic Natural Finish)',
  description: 'Hand-woven rattan storage basket with a warm natural finish.',
  tags: ['handmade', 'rattan', 'basket', 'sustainable'],
  materials: ['natural rattan'],
  colors: ['natural brown'],
  craftsmanshipNotes: 'Tight twill weave with reinforced rim.',
  careInstructions: 'Wipe with a dry cloth.',
  estimatedDimensions: 'Approx. 28 cm diameter × 24 cm height',
};

export function makeMerchant(overrides: Partial<Merchant['props']> = {}): Merchant {
  return MerchantEntity.create({
    id: 'm-001',
    displayName: 'Warung Sari',
    language: 'id',
    currency: 'IDR',
    channel: 'whatsapp',
    channelAddress: '6281234567890',
    ...overrides,
  });
}

export class FakeMerchantDirectory implements MerchantDirectory {
  private readonly byId = new Map<string, Merchant>();
  private readonly byAddress = new Map<string, Merchant>();

  constructor(merchants: readonly Merchant[] = []) {
    for (const merchant of merchants) {
      this.byId.set(merchant.id, merchant);
      this.byAddress.set(`${merchant.channel}:${merchant.channelAddress}`, merchant);
    }
  }

  async findById(merchantId: string): Promise<Merchant | null> {
    return this.byId.get(merchantId) ?? null;
  }

  async findByChannelAddress(channel: Channel, address: string): Promise<Merchant | null> {
    return this.byAddress.get(`${channel}:${address}`) ?? null;
  }
}

export class RecordingMessenger {
  readonly sent: OutboundMessage[] = [];

  async send(message: OutboundMessage): Promise<void> {
    this.sent.push({ ...message });
  }

  textsTo(to: string): string[] {
    return this.sent.filter((message) => message.to === to).map((message) => message.text);
  }
}

export class FakeVisionCataloger implements VisionCataloger {
  readonly analyzed: { note: string; language: LanguageCode }[] = [];

  constructor(private readonly analysis: CatalogAnalysis = RATTAN_BASKET_ANALYSIS) {}

  async analyze(_photo: ProductPhotoInput, merchantNote: string, merchantLanguage: LanguageCode): Promise<CatalogAnalysis> {
    this.analyzed.push({ note: merchantNote, language: merchantLanguage });
    return this.analysis;
  }
}

export class FakeMediaStore implements MediaStore {
  constructor(readonly url = 'https://media.example.com/photo.jpg') {}

  async save(): Promise<StoredMedia> {
    return { url: this.url };
  }
}

export class FakeExchangeRateProvider implements ExchangeRateProvider {
  constructor(private readonly rates: Readonly<Record<string, number>>) {}

  async getRates(_base: CurrencyCode): Promise<ReadonlyMap<CurrencyCode, number>> {
    return new Map(Object.entries(this.rates) as [CurrencyCode, number][]);
  }
}

export class FakeTranslator implements DialectTranslator {
  readonly calls: { text: string; from: LanguageCode; to: LanguageCode }[] = [];

  async translate(text: string, from: LanguageCode, to: LanguageCode): Promise<string> {
    this.calls.push({ text, from, to });
    return from === to ? text : `[${from}->${to}] ${text}`;
  }

  async detectLanguage(_text: string): Promise<LanguageCode> {
    return 'ja';
  }
}

export class FakePaymentProvider implements PaymentProvider {
  readonly invoices: InvoiceInput[] = [];

  constructor(private readonly issued: IssuedInvoice = { invoiceId: 'inv-123', paymentUrl: 'https://pay.example.com/inv-123' }) {}

  async createInvoice(input: InvoiceInput): Promise<IssuedInvoice> {
    this.invoices.push(input);
    return this.issued;
  }
}

export interface TestHarness {
  readonly repositories: InMemoryRepositories;
  readonly merchants: FakeMerchantDirectory;
  readonly messenger: RecordingMessenger;
  readonly visionCataloger: FakeVisionCataloger;
  readonly mediaStore: FakeMediaStore;
  readonly exchangeRates: FakeExchangeRateProvider;
  readonly translator: FakeTranslator;
  readonly payments: FakePaymentProvider;
}
