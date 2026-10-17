import type { LanguageCode } from '../../domain/value-objects/language.js';

/**
 * Port: dialect-aware translation between merchant and buyer languages.
 * Implementations must preserve colloquialisms and commercial intent
 * (e.g. "bisa nego tipis" -> "slight price negotiation acceptable").
 */
export interface DialectTranslator {
  translate(text: string, from: LanguageCode, to: LanguageCode): Promise<string>;

  /**
   * Detect the language an inbound buyer message is written in, so a new
   * negotiation can be opened with the correct buyer-side language.
   */
  detectLanguage(text: string): Promise<LanguageCode>;
}
