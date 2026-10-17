import { ValidationError } from '../errors.js';
import { Money } from '../value-objects/money.js';

export type ListingStatus = 'draft' | 'published';

export interface ListingProps {
  readonly id: string;
  readonly merchantId: string;
  readonly photoUrl: string;
  /** SEO-optimized title generated from the product photo. */
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly materials: readonly string[];
  readonly colors: readonly string[];
  readonly craftsmanshipNotes: string | null;
  readonly careInstructions: string | null;
  readonly estimatedDimensions: string | null;
  /** Price in the merchant's home currency. */
  readonly basePrice: Money;
  /** Snapshot of converted buyer-facing prices at listing time. */
  readonly priceConversions: readonly Money[];
  status: ListingStatus;
  readonly createdAt: Date;
}

/**
 * A published product listing generated from a single merchant photo.
 * This is what the global catalog serves and buyers negotiate against.
 */
export class Listing {
  private readonly props: ListingProps;

  private constructor(props: ListingProps) {
    this.props = props;
  }

  static create(input: Omit<ListingProps, 'status' | 'createdAt'> & { createdAt?: Date }): Listing {
    if (!input.id.trim()) {
      throw new ValidationError('Listing id is required');
    }
    if (!input.merchantId.trim()) {
      throw new ValidationError('Listing merchantId is required');
    }
    if (!input.photoUrl.trim()) {
      throw new ValidationError('Listing photoUrl is required');
    }
    if (input.title.trim().length < 3) {
      throw new ValidationError('Listing title must be at least 3 characters');
    }
    if (input.title.length > 200) {
      throw new ValidationError('Listing title must be at most 200 characters');
    }
    if (input.description.length > 5000) {
      throw new ValidationError('Listing description must be at most 5000 characters');
    }
    for (const tag of input.tags) {
      if (!tag.trim()) {
        throw new ValidationError('Listing tags must be non-empty');
      }
    }
    if (input.tags.length > 30) {
      throw new ValidationError('Listing supports at most 30 tags');
    }
    const currency = input.basePrice.currency;
    for (const conversion of input.priceConversions) {
      if (conversion.currency === currency) {
        throw new ValidationError(`Price conversion for ${currency} duplicates the base price`);
      }
    }
    return new Listing({ ...input, status: 'draft', createdAt: input.createdAt ?? new Date() });
  }

  /** Publish the listing to the global catalog. */
  publish(): void {
    this.props.status = 'published';
  }

  get id(): string {
    return this.props.id;
  }

  get merchantId(): string {
    return this.props.merchantId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get photoUrl(): string {
    return this.props.photoUrl;
  }

  get tags(): readonly string[] {
    return this.props.tags;
  }

  get materials(): readonly string[] {
    return this.props.materials;
  }

  get colors(): readonly string[] {
    return this.props.colors;
  }

  get basePrice(): Money {
    return this.props.basePrice;
  }

  get priceConversions(): readonly Money[] {
    return this.props.priceConversions;
  }

  get status(): ListingStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toSnapshot(): Record<string, unknown> {
    return {
      id: this.props.id,
      merchantId: this.props.merchantId,
      photoUrl: this.props.photoUrl,
      title: this.props.title,
      description: this.props.description,
      tags: [...this.props.tags],
      materials: [...this.props.materials],
      colors: [...this.props.colors],
      craftsmanshipNotes: this.props.craftsmanshipNotes,
      careInstructions: this.props.careInstructions,
      estimatedDimensions: this.props.estimatedDimensions,
      basePrice: { amount: this.props.basePrice.amount, currency: this.props.basePrice.currency },
      priceConversions: this.props.priceConversions.map((price) => ({
        amount: price.amount,
        currency: price.currency,
      })),
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
    };
  }

  static fromSnapshot(snapshot: Record<string, unknown>): Listing {
    const s = snapshot as {
      id: string;
      merchantId: string;
      photoUrl: string;
      title: string;
      description: string;
      tags: string[];
      materials: string[];
      colors: string[];
      craftsmanshipNotes: string | null;
      careInstructions: string | null;
      estimatedDimensions: string | null;
      basePrice: { amount: number; currency: Parameters<typeof Money.of>[1] };
      priceConversions: { amount: number; currency: Parameters<typeof Money.of>[1] }[];
      status: ListingStatus;
      createdAt: string;
    };

    return new Listing({
      id: s.id,
      merchantId: s.merchantId,
      photoUrl: s.photoUrl,
      title: s.title,
      description: s.description,
      tags: s.tags,
      materials: s.materials,
      colors: s.colors,
      craftsmanshipNotes: s.craftsmanshipNotes,
      careInstructions: s.careInstructions,
      estimatedDimensions: s.estimatedDimensions,
      basePrice: Money.of(s.basePrice.amount, s.basePrice.currency),
      priceConversions: s.priceConversions.map((price) => Money.of(price.amount, price.currency)),
      status: s.status,
      createdAt: new Date(s.createdAt),
    });
  }
}
