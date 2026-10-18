import type { Merchant } from '../../domain/entities/merchant.js';
import type { Channel } from '../../domain/value-objects/channel.js';
import type { MerchantDirectory } from '../../application/ports/merchant-directory.js';
import { toDomainMerchant, type MerchantConfig } from '../config.js';

/**
 * Static merchant directory loaded from MERCHANTS_JSON. Onboarding a new
 * micro-SME is a config entry — operational in under a minute, matching the
 * frictionless onboarding promise of the product.
 */
export class StaticMerchantDirectory implements MerchantDirectory {
  private readonly byId = new Map<string, Merchant>();
  private readonly byChannelAddress = new Map<string, Merchant>();

  constructor(merchantConfigs: readonly MerchantConfig[]) {
    for (const config of merchantConfigs) {
      this.register(config);
    }
  }

  register(config: MerchantConfig): Merchant {
    const merchant = toDomainMerchant(config);
    this.byId.set(merchant.id, merchant);
    this.byChannelAddress.set(`${merchant.channel}:${merchant.channelAddress}`, merchant);
    return merchant;
  }

  listAll(): readonly Merchant[] {
    return [...this.byId.values()];
  }

  async findById(merchantId: string): Promise<Merchant | null> {
    return this.byId.get(merchantId) ?? null;
  }

  async findByChannelAddress(channel: Channel, address: string): Promise<Merchant | null> {
    return this.byChannelAddress.get(`${channel}:${address}`) ?? null;
  }
}
