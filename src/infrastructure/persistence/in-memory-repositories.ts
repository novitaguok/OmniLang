import { Listing } from '../../domain/entities/listing.js';
import { Negotiation, ACTIVE_STAGES } from '../../domain/entities/negotiation.js';
import { Order } from '../../domain/entities/order.js';
import type { Channel } from '../../domain/value-objects/channel.js';
import type { ListingRepository } from '../../application/ports/listing-repository.js';
import type { NegotiationRepository } from '../../application/ports/negotiation-repository.js';
import type { OrderRepository } from '../../application/ports/order-repository.js';

interface SnapshotEnvelope {
  readonly kind: 'listing' | 'negotiation' | 'order';
  readonly snapshot: Record<string, unknown>;
}

/**
 * In-memory repositories storing entity snapshots. Used by default in
 * prototype mode, in demo mode and in the test suite — every mutation and
 * read round-trips through the snapshot layer, so the serialization
 * contract stays honest even without a database.
 */
export class InMemoryRepositories implements ListingRepository, NegotiationRepository, OrderRepository {
  private readonly listingStore = new Map<string, SnapshotEnvelope>();
  private readonly negotiationStore = new Map<string, SnapshotEnvelope>();
  private readonly orderStore = new Map<string, SnapshotEnvelope>();

  async save(listing: Listing): Promise<void>;
  async save(negotiation: Negotiation): Promise<void>;
  async save(order: Order): Promise<void>;
  async save(entity: Listing | Negotiation | Order): Promise<void> {
    if (entity instanceof Listing) {
      this.listingStore.set(entity.id, structuredClone({ kind: 'listing', snapshot: entity.toSnapshot() }));
      return;
    }
    if (entity instanceof Negotiation) {
      this.negotiationStore.set(entity.id, structuredClone({ kind: 'negotiation', snapshot: entity.toSnapshot() }));
      return;
    }
    this.orderStore.set(entity.id, structuredClone({ kind: 'order', snapshot: entity.toSnapshot() }));
  }

  async findById(listingId: string): Promise<Listing | null>;
  async findById(negotiationId: string): Promise<Negotiation | null>;
  async findById(orderId: string): Promise<Order | null>;
  async findById(id: string): Promise<Listing | Negotiation | Order | null> {
    const listing = this.listingStore.get(id);
    if (listing) {
      return Listing.fromSnapshot(listing.snapshot);
    }
    const negotiation = this.negotiationStore.get(id);
    if (negotiation) {
      return Negotiation.fromSnapshot(negotiation.snapshot);
    }
    const order = this.orderStore.get(id);
    if (order) {
      return Order.fromSnapshot(order.snapshot);
    }
    return null;
  }

  async listByMerchant(merchantId: string): Promise<readonly Listing[]> {
    return [...this.listingStore.values()]
      .map((entry) => Listing.fromSnapshot(entry.snapshot))
      .filter((listing) => listing.merchantId === merchantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findActiveByBuyer(channel: Channel, buyerAddress: string): Promise<Negotiation | null> {
    return this.findActive(
      (negotiation) => negotiation.channel === channel && negotiation.buyerAddress === buyerAddress,
    );
  }

  async findActiveByMerchant(channel: Channel, merchantAddress: string): Promise<Negotiation | null> {
    return this.findActive(
      (negotiation) => negotiation.channel === channel && negotiation.merchantAddress === merchantAddress,
    );
  }

  private findActive(predicate: (negotiation: Negotiation) => boolean): Negotiation | null {
    const matches = [...this.negotiationStore.values()]
      .map((entry) => Negotiation.fromSnapshot(entry.snapshot))
      .filter((negotiation) => ACTIVE_STAGES.includes(negotiation.stage) && predicate(negotiation))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return matches[0] ?? null;
  }

  async listNegotiationsByMerchant(merchantId: string): Promise<readonly Negotiation[]> {
    return [...this.negotiationStore.values()]
      .map((entry) => Negotiation.fromSnapshot(entry.snapshot))
      .filter((negotiation) => negotiation.merchantId === merchantId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /** Test/demo helper: reset all stores. */
  clear(): void {
    this.listingStore.clear();
    this.negotiationStore.clear();
    this.orderStore.clear();
  }
}
