import type { DialectTranslator } from '../../application/ports/dialect-translator.js';
import { resolveLanguageTag } from '../../domain/value-objects/language.js';
import type { LanguageCode } from '../../domain/value-objects/language.js';

/**
 * Demo-mode translator: returns the source text unchanged (tagged so the
 * relay behavior stays visible) and detects language from a small
 * colloquial lexicon. Requires no cloud credentials.
 */
export class PassthroughDialectTranslator implements DialectTranslator {
  async translate(text: string, from: LanguageCode, to: LanguageCode): Promise<string> {
    if (from === to) {
      return text;
    }
    return `[${to}] ${text}`;
  }

  async detectLanguage(text: string): Promise<LanguageCode> {
    const lexicon: Record<LanguageCode, readonly RegExp[]> = {
      id: [/\b(halo|berapa|mau|jual|bisa|ongkir|rb|ribu|keranjang|batik|banget|dong)\b/i],
      tl: [/\b(magkano|pwede|totoo|bili|tayo|lang|po)\b/i],
      hi: [/\b(कीमत|कितना|बेचना|नमस्ते)\b/],
      vi: [/\b(bao|nhieu|ban|toi|khong)\b/i],
      ja: [/[\u3040-\u30ff]/, /[\u4e00-\u9faf]/],
      en: [/\b(hello|price|how much|buy|sell|shipping)\b/i],
    };
    for (const [language, patterns] of Object.entries(lexicon) as [LanguageCode, readonly RegExp[]][]) {
      if (patterns.some((pattern) => pattern.test(text))) {
        return language;
      }
    }
    return resolveLanguageTag('en')!;
  }
}
