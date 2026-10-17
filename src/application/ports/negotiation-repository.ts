import type { Negotiation } from '../../domain/entities/negotiation.js';
import type { Channel } from '../../domain/value-objects/channel.js';

export interface NegotiationRepository {
  save(negotiation: Negotiation): Promise<void>;
  findById(negotiationId: string): Promise<Negotiation | null>;
  /** Most recently updated active negotiation for a given buyer. */
  findActiveByBuyer(channel: Channel, buyerAddress: string): Promise<Negotiation | null>;
  /** Most recently updated active negotiation involving a given merchant. */
  findActiveByMerchant(channel: Channel, merchantAddress: string): Promise<Negotiation | null>;
}
