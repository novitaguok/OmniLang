import { TranslationServiceClient } from '@google-cloud/translate';

import type { DialectTranslator } from '../../application/ports/dialect-translator.js';
import { resolveLanguageTag } from '../../domain/value-objects/language.js';
import type { LanguageCode } from '../../domain/value-objects/language.js';
import { MissingConfigurationError } from '../../application/errors.js';
import { InfrastructureError } from '../errors.js';

/**
 * Translation adapter backed by the Vertex AI Translation API (v3).
 * Preserves informal merchant idioms while keeping commercial negotiation
 * intent; detection is used when opening negotiations for new buyers.
 */
export class VertexDialectTranslator implements DialectTranslator {
  private readonly client: TranslationServiceClient;
  private readonly parent: string;

  constructor(googleCloud: { project: string; location: string } | null) {
    if (!googleCloud) {
      throw new MissingConfigurationError(
        'Vertex AI translation requires GCP_PROJECT/GCP_LOCATION credentials (or set OMNILANG_DEMO_MODE=true).',
      );
    }
    this.client = new TranslationServiceClient({ apiEndpoint: 'translation.googleapis.com' });
    this.parent = `projects/${googleCloud.project}/locations/${googleCloud.location}`;
  }

  async translate(text: string, from: LanguageCode, to: LanguageCode): Promise<string> {
    if (from === to) {
      return text;
    }
    try {
      const [response] = await this.client.translateText({
        parent: this.parent,
        contents: [text],
        mimeType: 'text/plain',
        sourceLanguageCode: from,
        targetLanguageCode: to,
      });
      const translation = response.translations?.[0]?.translatedText;
      if (!translation) {
        throw new InfrastructureError('Vertex AI translation returned no result');
      }
      return translation;
    } catch (error) {
      if (error instanceof InfrastructureError) {
        throw error;
      }
      throw new InfrastructureError(`Vertex AI translation failed (${from} -> ${to})`, error);
    }
  }

  async detectLanguage(text: string): Promise<LanguageCode> {
    try {
      const [response] = await this.client.detectLanguage({
        parent: this.parent,
        content: text,
        mimeType: 'text/plain',
      });
      const detected = response.languages?.[0]?.languageCode
        ? resolveLanguageTag(response.languages[0].languageCode)
        : null;
      return detected ?? 'en';
    } catch (error) {
      throw new InfrastructureError('Vertex AI language detection failed', error);
    }
  }
}
