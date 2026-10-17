import { randomUUID } from 'node:crypto';

import { Listing } from '../../domain/entities/listing.js';
import { Money } from '../../domain/value-objects/money.js';
import { parsePriceHint } from '../../domain/services/price-hint.js';
import type { CurrencyCode } from '../../domain/value-objects/money.js';
import type { Channel } from '../../domain/value-objects/channel.js';
import { MerchantNotFoundError } from '../errors.js';
import type { MerchantDirectory } from '../ports/merchant-directory.js';
import type { ExchangeRateProvider } from '../ports/exchange-rate-provider.js';
import type { ChannelMessenger } from '../ports/channel-messenger.js';
import type { ListingRepository } from '../ports/listing-repository.js';
import type { MediaStore } from '../ports/media-store.js';
import type { ProductPhotoInput, VisionCataloger } from '../ports/vision-cataloger.js';

/** Buyer-facing conversion targets shown on every global listing. */
const TARGET_CONVERSION_CURRENCIES: readonly CurrencyCode[] = ['USD', 'JPY', 'SGD'];

export interface CatalogProductPhotoInput {
  readonly merchantId: string;
  readonly channel: Channel;
  readonly photo: ProductPhotoInput;
  /** Free-text note accompanying the photo, e.g. "Ini keranjang rotan asli, mau jual 75rb per buah". */
  readonly merchantNote: string;
}

export interface CatalogProductPhotoDeps {
  readonly merchants: MerchantDirectory;
  readonly visionCataloger: VisionCataloger;
  readonly mediaStore: MediaStore;
  readonly exchangeRates: ExchangeRateProvider;
  readonly listings: ListingRepository;
  readonly messenger: ChannelMessenger;
  readonly catalogBaseUrl: string;
}

/**
 * Use case 1 — Multimodal Photo Catalog Generator.
 *
 * Merchant snaps a product photo (with a short colloquial note stating what
 * it is and the asking price). The agent:
 *   1. stores the raw photo,
 *   2. runs multimodal vision analysis for title/description/tags/materials,
 *   3. parses the price hint from the note,
 *   4. snapshots multi-currency conversions (IDR -> USD/JPY/SGD),
 *   5. publishes the listing and sends the merchant a preview with a
 *      shareable catalog link.
 *
 * Returns null (after asking the merchant for a price) when the note
 * contains no parseable price — quantity chatter never becomes a price.
 */
export class CatalogProductPhotoUseCase {
  constructor(private readonly deps: CatalogProductPhotoDeps) {}

  async execute(input: CatalogProductPhotoInput): Promise<Listing | null> {
    const merchant = await this.deps.merchants.findById(input.merchantId);
    if (!merchant) {
      throw new MerchantNotFoundError(input.merchantId);
    }

    const priceAmount = parsePriceHint(input.merchantNote);
    if (priceAmount === null) {
      await this.deps.messenger.send({
        channel: input.channel,
        to: merchant.channelAddress,
        text:
          'Received your photo! One thing is missing: the price. ' +
          'Please resend it with your asking price, e.g. "75rb per buah", ' +
          'and I will publish your listing to the global catalog.',
      });
      return null;
    }

    const media = await this.deps.mediaStore.save(input.photo);
    const analysis = await this.deps.visionCataloger.analyze(input.photo, input.merchantNote, merchant.language);

    const basePrice = Money.of(priceAmount, merchant.currency);
    const rates = await this.deps.exchangeRates.getRates(merchant.currency);
    const priceConversions = TARGET_CONVERSION_CURRENCIES.filter((currency) => currency !== merchant.currency)
      .map((currency) => {
        const rate = rates.get(currency);
        return rate === undefined ? null : basePrice.convertTo(currency, rate);
      })
      .filter((price): price is Money => price !== null);

    const listing = Listing.create({
      id: randomUUID(),
      merchantId: merchant.id,
      photoUrl: media.url,
      title: analysis.title,
      description: analysis.description,
      tags: analysis.tags,
      materials: analysis.materials,
      colors: analysis.colors,
      craftsmanshipNotes: analysis.craftsmanshipNotes,
      careInstructions: analysis.careInstructions,
      estimatedDimensions: analysis.estimatedDimensions,
      basePrice,
      priceConversions,
    });
    listing.publish();
    await this.deps.listings.save(listing);

    const priceLines = listing.priceConversions.map((price) => price.format()).join(' / ');
    const preview =
      '✅ Approved! Live listing published to the global catalog.\n\n' +
      `📦 ${listing.title}\n` +
      `💰 ${listing.basePrice.format()}${priceLines ? ` (${priceLines})` : ''}\n` +
      `${listing.description}\n\n` +
      `Tags: ${listing.tags.map((tag) => `#${tag.replaceAll(/\s+/g, '')}`).join(' ')}\n` +
      `Share your listing: ${this.deps.catalogBaseUrl}/p/${listing.id}`;

    await this.deps.messenger.send({
      channel: input.channel,
      to: merchant.channelAddress,
      text: preview,
    });

    return listing;
  }
}
