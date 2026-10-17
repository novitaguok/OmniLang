import type { LanguageCode } from '../../domain/value-objects/language.js';

export interface ProductPhotoInput {
  readonly data: Buffer;
  readonly mimeType: string;
}

/**
 * The structured result of multimodal photo analysis. Produced by the
 * Gemini adapter; consumed by the catalog use case to build a listing.
 */
export interface CatalogAnalysis {
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly materials: readonly string[];
  readonly colors: readonly string[];
  readonly craftsmanshipNotes: string | null;
  readonly careInstructions: string | null;
  readonly estimatedDimensions: string | null;
}

/** Port: turns a raw smartphone photo + free-text note into a catalog analysis. */
export interface VisionCataloger {
  analyze(photo: ProductPhotoInput, merchantNote: string, merchantLanguage: LanguageCode): Promise<CatalogAnalysis>;
}
