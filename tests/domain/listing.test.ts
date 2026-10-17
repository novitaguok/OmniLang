import { describe, expect, it } from 'vitest';

import { Listing } from '../../src/domain/entities/listing.js';
import { Money } from '../../src/domain/value-objects/money.js';
import { RATTAN_BASKET_ANALYSIS } from '../support/fakes.js';

function makeListing(overrides: Partial<Parameters<typeof Listing.create>[0]> = {}) {
  return Listing.create({
    id: 'l-001',
    merchantId: 'm-001',
    photoUrl: 'https://media.example.com/photo.jpg',
    title: RATTAN_BASKET_ANALYSIS.title,
    description: RATTAN_BASKET_ANALYSIS.description,
    tags: RATTAN_BASKET_ANALYSIS.tags,
    materials: RATTAN_BASKET_ANALYSIS.materials,
    colors: RATTAN_BASKET_ANALYSIS.colors,
    craftsmanshipNotes: RATTAN_BASKET_ANALYSIS.craftsmanshipNotes,
    careInstructions: RATTAN_BASKET_ANALYSIS.careInstructions,
    estimatedDimensions: RATTAN_BASKET_ANALYSIS.estimatedDimensions,
    basePrice: Money.of(75_000, 'IDR'),
    priceConversions: [Money.of(5, 'USD'), Money.of(750, 'JPY')],
    ...overrides,
  });
}

describe('Listing', () => {
  it('starts as draft and can be published', () => {
    const listing = makeListing();
    expect(listing.status).toBe('draft');
    listing.publish();
    expect(listing.status).toBe('published');
  });

  it('rejects short titles and duplicate conversion currencies', () => {
    expect(() => makeListing({ title: 'ab' })).toThrow();
    expect(() => makeListing({ priceConversions: [Money.of(75_000, 'IDR')] })).toThrow();
  });

  it('round-trips through a snapshot', () => {
    const listing = makeListing();
    listing.publish();
    const restored = Listing.fromSnapshot(JSON.parse(JSON.stringify(listing.toSnapshot())));

    expect(restored.title).toBe(listing.title);
    expect(restored.status).toBe('published');
    expect(restored.basePrice.amount).toBe(75_000);
    expect(restored.priceConversions.map((price) => price.currency)).toEqual(['USD', 'JPY']);
  });
});
