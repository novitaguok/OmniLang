import { randomUUID } from 'node:crypto';

import { Negotiation } from '../../domain/entities/negotiation.js';
import type { Merchant } from '../../domain/entities/merchant.js';
import type { Channel } from '../../domain/value-objects/channel.js';
import type { MerchantDirectory } from '../ports/merchant-directory.js';
import type { ChannelMessenger } from '../ports/channel-messenger.js';
import type { DialectTranslator } from '../ports/dialect-translator.js';
import type { ListingRepository } from '../ports/listing-repository.js';
import type { NegotiationRepository } from '../ports/negotiation-repository.js';

export interface RelayChatMessageInput {
  readonly channel: Channel;
  /** Channel address of whoever sent this message (merchant or buyer). */
  readonly senderAddress: string;
  readonly text: string;
  /**
   * The merchant number that received the message when known (WhatsApp
   * display phone number). Used to open new negotiations for unknown buyers.
   */
  readonly merchantAddress?: string;
  /** Set when the buyer arrives via a specific listing link. */
  readonly listingId?: string;
}

export interface RelayChatMessageDeps {
  readonly merchants: MerchantDirectory;
  readonly negotiations: NegotiationRepository;
  readonly listings: ListingRepository;
  readonly translator: DialectTranslator;
  readonly messenger: ChannelMessenger;
}

/**
 * Use case 2 — Real-Time Dialect Negotiation Bridge.
 *
 * Routes every inbound chat turn to the other side in their own language:
 *   - merchant replies are translated into the buyer's language,
 *   - buyer messages are translated into the merchant's dialect,
 * preserving deal history: every turn is recorded on the negotiation and
 * agreement context (discounts, shipping, order intent) survives across turns.
 *
 * Senders are classified against the merchant directory. Buyers without an
 * active negotiation get one opened when the merchant can be resolved (via
 * the receiving number or the listing the buyer clicked); otherwise they
 * receive polite guidance.
 */
export class RelayChatMessageUseCase {
  constructor(private readonly deps: RelayChatMessageDeps) {}

  async execute(input: RelayChatMessageInput): Promise<void> {
    const sender = await this.deps.merchants.findByChannelAddress(input.channel, input.senderAddress);

    if (sender) {
      await this.relayMerchantTurn(input, sender);
    } else {
      await this.relayBuyerTurn(input);
    }
  }

  private async relayMerchantTurn(input: RelayChatMessageInput, merchant: Merchant): Promise<void> {
    const negotiation = await this.deps.negotiations.findActiveByMerchant(input.channel, merchant.channelAddress);
    if (!negotiation) {
      await this.deps.messenger.send({
        channel: input.channel,
        to: input.senderAddress,
        text:
          'You have no active buyer conversation right now. ' +
          'When an international buyer messages your shop, their inquiry will appear here translated.',
      });
      return;
    }

    const translated = await this.deps.translator.translate(
      input.text,
      negotiation.merchantLanguage,
      negotiation.buyerLanguage,
    );
    await this.deps.messenger.send({ channel: input.channel, to: negotiation.buyerAddress, text: translated });
    negotiation.recordTurn('merchant', input.text, translated);
    await this.deps.negotiations.save(negotiation);
  }

  private async relayBuyerTurn(input: RelayChatMessageInput): Promise<void> {
    let negotiation = await this.deps.negotiations.findActiveByBuyer(input.channel, input.senderAddress);

    if (!negotiation) {
      const merchant =
        (input.merchantAddress
          ? await this.deps.merchants.findByChannelAddress(input.channel, input.merchantAddress)
          : null) ?? (await this.resolveMerchantFromListing(input.listingId));
      if (!merchant) {
        await this.deps.messenger.send({
          channel: input.channel,
          to: input.senderAddress,
          text:
            'Hi! I am the OmniLang commerce agent. I connect international buyers with local makers. ' +
            'To start a negotiation, please message a shop via its listing link on omnilang.shop.',
        });
        return;
      }

      const buyerLanguage = await this.deps.translator.detectLanguage(input.text);
      negotiation = Negotiation.open({
        id: randomUUID(),
        channel: input.channel,
        merchantId: merchant.id,
        merchantAddress: merchant.channelAddress,
        merchantLanguage: merchant.language,
        buyerAddress: input.senderAddress,
        buyerLanguage,
        listingId: input.listingId ?? null,
      });
    }

    const translated = await this.deps.translator.translate(
      input.text,
      negotiation.buyerLanguage,
      negotiation.merchantLanguage,
    );
    await this.deps.messenger.send({ channel: input.channel, to: negotiation.merchantAddress, text: translated });
    negotiation.recordTurn('buyer', input.text, translated);
    await this.deps.negotiations.save(negotiation);
  }

  private async resolveMerchantFromListing(listingId: string | undefined) {
    if (!listingId) {
      return null;
    }
    const listing = await this.deps.listings.findById(listingId);
    if (!listing) {
      return null;
    }
    return this.deps.merchants.findById(listing.merchantId);
  }
}
