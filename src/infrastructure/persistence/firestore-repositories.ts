import { Firestore } from '@google-cloud/firestore';

import { Listing } from '../../domain/entities/listing.js';
import { Negotiation, ACTIVE_STAGES } from '../../domain/entities/negotiation.js';
import { Order } from '../../domain/entities/order.js';
import type { Channel } from '../../domain/value-objects/channel.js';
import type { ListingRepository } from '../../application/ports/listing-repository.js';
import type { NegotiationRepository } from '../../application/ports/negotiation-repository.js';
import type { OrderRepository } from '../../application/ports/order-repository.js';

const LISTINGS = 'listings';
const NEGOTIATIONS = 'negotiations';
const ORDERS = 'orders';

/**
 * Firestore adapters (native mode). Each aggregate is stored as its JSON
 * snapshot under its id. The active-negotiation lookups filter on
 * channel/address/stage and order by updatedAt — deploy the matching
 * composite indexes (see README) when enabling this persistence mode.
 */
export class FirestoreRepositories implements ListingRepository, NegotiationRepository, OrderRepository {
  constructor(private readonly db: Firestore) {}

  async save(listing: Listing): Promise<void>;
  async save(negotiation: Negotiation): Promise<void>;
  async save(order: Order): Promise<void>;
  async save(entity: Listing | Negotiation | Order): Promise<void> {
    if (entity instanceof Listing) {
      await this.db.collection(LISTINGS).doc(entity.id).set(entity.toSnapshot());
      return;
    }
    if (entity instanceof Negotiation) {
      await this.db.collection(NEGOTIATIONS).doc(entity.id).set(entity.toSnapshot());
      return;
    }
    await this.db.collection(ORDERS).doc(entity.id).set(entity.toSnapshot());
  }

  async findById(listingId: string): Promise<Listing | null>;
  async findById(negotiationId: string): Promise<Negotiation | null>;
  async findById(orderId: string): Promise<Order | null>;
  async findById(id: string): Promise<Listing | Negotiation | Order | null> {
    const listing = await this.db.collection(LISTINGS).doc(id).get();
    if (listing.exists) {
      return Listing.fromSnapshot(listing.data() ?? {});
    }
    const negotiation = await this.db.collection(NEGOTIATIONS).doc(id).get();
    if (negotiation.exists) {
      return Negotiation.fromSnapshot(negotiation.data() ?? {});
    }
    const order = await this.db.collection(ORDERS).doc(id).get();
    if (order.exists) {
      return Order.fromSnapshot(order.data() ?? {});
    }
    return null;
  }

  async listByMerchant(merchantId: string): Promise<readonly Listing[]> {
    const snapshot = await this.db
      .collection(LISTINGS)
      .where('merchantId', '==', merchantId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => Listing.fromSnapshot(doc.data()));
  }

  async findActiveByBuyer(channel: Channel, buyerAddress: string): Promise<Negotiation | null> {
    const snapshot = await this.db
      .collection(NEGOTIATIONS)
      .where('channel', '==', channel)
      .where('buyerAddress', '==', buyerAddress)
      .where('stage', 'in', [...ACTIVE_STAGES])
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? Negotiation.fromSnapshot(doc.data()) : null;
  }

  async findActiveByMerchant(channel: Channel, merchantAddress: string): Promise<Negotiation | null> {
    const snapshot = await this.db
      .collection(NEGOTIATIONS)
      .where('channel', '==', channel)
      .where('merchantAddress', '==', merchantAddress)
      .where('stage', 'in', [...ACTIVE_STAGES])
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? Negotiation.fromSnapshot(doc.data()) : null;
  }

  async listNegotiationsByMerchant(merchantId: string): Promise<readonly Negotiation[]> {
    const snapshot = await this.db
      .collection(NEGOTIATIONS)
      .where('merchantId', '==', merchantId)
      .orderBy('updatedAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => Negotiation.fromSnapshot(doc.data()));
  }
}
