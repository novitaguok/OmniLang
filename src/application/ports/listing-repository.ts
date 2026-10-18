import type { Listing } from '../../domain/entities/listing.js';

export interface ListingRepository {
  save(listing: Listing): Promise<void>;
  findById(listingId: string): Promise<Listing | null>;
  listByMerchant(merchantId: string): Promise<readonly Listing[]>;
}
