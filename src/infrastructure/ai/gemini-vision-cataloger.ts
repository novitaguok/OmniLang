import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import type { CatalogAnalysis, VisionCataloger } from '../../application/ports/vision-cataloger.js';
import type { ProductPhotoInput } from '../../application/ports/vision-cataloger.js';
import type { LanguageCode } from '../../domain/value-objects/language.js';
import { assertLanguageCode } from '../../domain/value-objects/language.js';
import { MissingConfigurationError } from '../../application/errors.js';
import { InfrastructureError } from '../errors.js';

const analysisSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1)).min(1).max(30),
  materials: z.array(z.string()),
  colors: z.array(z.string()),
  craftsmanshipNotes: z.string().nullable(),
  careInstructions: z.string().nullable(),
  estimatedDimensions: z.string().nullable(),
});

const PROMPT_TEMPLATE = [
  'You are the catalog engine of OmniLang, a cross-border commerce agent for JAPAC micro-SMEs.',
  'You receive one raw smartphone photo of a handcrafted or retail product, plus a short note',
  'the merchant wrote in their local language.',
  '',
  'Inspect the craft: materials, colors, handicraft style, condition and visible texture.',
  'Then produce an SEO-optimized global product listing the merchant can sell to international buyers.',
  '',
  'Rules:',
  '- Write the title and description in high-converting marketplace English.',
  '- The description must be 2-4 short sentences, buyer-facing, no markdown.',
  '- Provide 3-8 lowercase tags (single words or short phrases, no "#").',
  '- If the merchant note states product details, respect them.',
  '- Respond with ONLY a JSON object matching exactly this schema:',
  '{"title":string,"description":string,"tags":string[],"materials":string[],"colors":string[],"craftsmanshipNotes":string|null,"careInstructions":string|null,"estimatedDimensions":string|null}',
].join('\n');

export interface GeminiVisionCatalogerOptions {
  readonly model: string;
  readonly apiKey: string | null;
  readonly googleCloud: { project: string; location: string } | null;
}

/**
 * Vision adapter backed by Gemini (Vertex AI or Google AI API key).
 * Sends the photo inline plus the structured prompt and validates the
 * model's JSON output against the catalog analysis schema.
 */
export class GeminiVisionCataloger implements VisionCataloger {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(options: GeminiVisionCatalogerOptions) {
    if (!options.apiKey && !options.googleCloud) {
      throw new MissingConfigurationError(
        'Gemini vision requires GEMINI_API_KEY or GCP_PROJECT/GCP_LOCATION service-account credentials (or set OMNILANG_DEMO_MODE=true).',
      );
    }
    this.client = options.googleCloud
      ? new GoogleGenAI({ vertexai: true, project: options.googleCloud.project, location: options.googleCloud.location })
      : new GoogleGenAI({ apiKey: options.apiKey! });
    this.model = options.model;
  }

  async analyze(photo: ProductPhotoInput, merchantNote: string, merchantLanguage: LanguageCode): Promise<CatalogAnalysis> {
    assertLanguageCode(merchantLanguage);
    const prompt = merchantNote.trim()
      ? `${PROMPT_TEMPLATE}\n\nMerchant note (${merchantLanguage}): "${merchantNote.trim()}"`
      : PROMPT_TEMPLATE;

    let responseText: string | undefined;
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: photo.mimeType, data: photo.data.toString('base64') } },
              { text: prompt },
            ],
          },
        ],
        config: { responseMimeType: 'application/json', temperature: 0.4 },
      });
      responseText = response.text;
    } catch (error) {
      throw new InfrastructureError(`Gemini vision analysis failed for model '${this.model}'`, error);
    }

    if (!responseText) {
      throw new InfrastructureError('Gemini vision analysis returned an empty response');
    }
    return parseAnalysis(responseText);
  }
}

export function parseAnalysis(raw: string): CatalogAnalysis {
  let jsonText = raw.trim();
  const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    jsonText = fenced[1].trim();
  }
  const parsed = analysisSchema.safeParse(JSON.parse(jsonText));
  if (!parsed.success) {
    throw new InfrastructureError(`Gemini vision analysis returned invalid JSON: ${parsed.error.message}`);
  }
  return parsed.data;
}
