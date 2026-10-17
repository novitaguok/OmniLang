import type { Merchant } from '../../domain/entities/merchant.js';
import type { Channel } from '../../domain/value-objects/channel.js';

/**
 * Port: the registry of onboarded merchants. Senders are resolved against
 * it to decide whether an inbound message is merchant- or buyer-originated.
 */
export interface MerchantDirectory {
  findById(merchantId: string): Promise<Merchant | null>;
  findByChannelAddress(channel: Channel, address: string): Promise<Merchant | null>;
}
