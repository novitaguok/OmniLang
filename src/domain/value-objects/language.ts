import type { CurrencyCode } from './money.js';
import { UnsupportedLocaleError } from '../errors.js';

/**
 * Languages spoken across the JAPAC merchant and buyer base.
 * `tl` covers Filipino/Tagalog incl. Taglish, `id` covers Bahasa Indonesia
 * incl. colloquial slang — the translation adapters preserve both.
 */
export const SUPPORTED_LANGUAGES = ['id', 'tl', 'hi', 'vi', 'ja', 'en'] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function assertLanguageCode(value: string): LanguageCode {
  if (!isLanguageCode(value)) {
    throw new UnsupportedLocaleError(value, 'language');
  }
  return value;
}

/**
 * Resolve real-world BCP-47 tags (from channel payloads) onto our
 * supported language set. Returns null for unsupported languages.
 */
export function resolveLanguageTag(tag: string): LanguageCode | null {
  const base = tag.toLowerCase().split('-')[0] ?? tag.toLowerCase();
  switch (base) {
    case 'id':
    case 'in': // legacy Indonesian code
      return 'id';
    case 'tl':
    case 'fil':
      return 'tl';
    case 'hi':
      return 'hi';
    case 'vi':
      return 'vi';
    case 'ja':
      return 'ja';
    case 'en':
      return 'en';
    default:
      return null;
  }
}

/** The currency a merchant operating in a given language typically prices in. */
export function defaultCurrencyForLanguage(language: LanguageCode): CurrencyCode {
  switch (language) {
    case 'id':
      return 'IDR';
    case 'tl':
      return 'PHP';
    case 'hi':
      return 'INR';
    case 'vi':
      return 'VND';
    case 'ja':
      return 'JPY';
    case 'en':
      return 'USD';
  }
}

export function languageDisplayName(language: LanguageCode): string {
  const names: Record<LanguageCode, string> = {
    id: 'Bahasa Indonesia',
    tl: 'Tagalog / Filipino',
    hi: 'Hindi',
    vi: 'Vietnamese',
    ja: 'Japanese',
    en: 'English',
  };
  return names[language];
}
