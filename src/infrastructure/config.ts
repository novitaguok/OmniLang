import { z } from 'zod';

import { isChannel } from '../domain/value-objects/channel.js';
import { isLanguageCode } from '../domain/value-objects/language.js';
import { assertCurrencyCode } from '../domain/value-objects/money.js';
import type { CurrencyCode } from '../domain/value-objects/money.js';
import { Merchant } from '../domain/entities/merchant.js';
import type { LanguageCode } from '../domain/value-objects/language.js';
import type { Channel } from '../domain/value-objects/channel.js';

const merchantConfigSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  language: z.string().refine(isLanguageCode, 'unsupported merchant language'),
  currency: z.string().refine((value) => typeof value === 'string', 'invalid currency'),
  channel: z.string().refine(isChannel, 'unsupported channel'),
  address: z.string().min(1),
});

export interface MerchantConfig {
  id: string;
  displayName: string;
  language: LanguageCode;
  currency: CurrencyCode;
  channel: Channel;
  address: string;
}

export interface OmniLangConfig {
  readonly port: number;
  readonly catalogBaseUrl: string;
  readonly persistence: 'memory' | 'firestore';
  readonly demoMode: boolean;
  readonly googleCloud: { project: string; location: string } | null;
  readonly gemini: { model: string; apiKey: string | null };
  readonly storageBucket: string | null;
  readonly whatsapp: {
    accessToken: string | null;
    phoneNumberId: string | null;
    verifyToken: string | null;
    apiVersion: string;
  };
  readonly line: { channelAccessToken: string | null; channelSecret: string | null };
  readonly paymentsApiUrl: string | null;
  readonly merchants: readonly MerchantConfig[];
  /** Indicative FX rates: target units per 1 IDR. */
  readonly fxRates: Readonly<Record<string, number>>;
}

const DEFAULT_FX_RATES: Readonly<Record<string, number>> = {
  USD: 0.000064,
  JPY: 0.0098,
  SGD: 0.000084,
  PHP: 0.0033,
  INR: 0.0054,
  VND: 0.16,
};

function parseOptionalJson<T>(raw: string | undefined): T | null {
  if (!raw || !raw.trim()) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): OmniLangConfig {
  const merchants = (parseOptionalJson<unknown[]>(env.MERCHANTS_JSON) ?? [])
    .map((entry) => merchantConfigSchema.parse(entry))
    .map((entry): MerchantConfig => ({
      ...entry,
      language: entry.language as LanguageCode,
      currency: assertCurrencyCode(entry.currency),
      channel: entry.channel as Channel,
    }));

  const fxRates = parseOptionalJson<Record<string, number>>(env.FX_RATES_JSON) ?? DEFAULT_FX_RATES;

  const project = env.GCP_PROJECT?.trim() || null;
  const location = env.GCP_LOCATION?.trim() || null;

  return {
    port: Number.parseInt(env.PORT ?? '8080', 10) || 8080,
    catalogBaseUrl: (env.CATALOG_BASE_URL ?? 'https://omnilang.example.com').replace(/\/$/, ''),
    persistence: env.OMNILANG_PERSISTENCE === 'firestore' ? 'firestore' : 'memory',
    demoMode: env.OMNILANG_DEMO_MODE === 'true',
    googleCloud: project ? { project, location: location ?? 'us-central1' } : null,
    gemini: {
      model: env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash',
      apiKey: env.GEMINI_API_KEY?.trim() || null,
    },
    storageBucket: env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() || null,
    whatsapp: {
      accessToken: env.WHATSAPP_ACCESS_TOKEN?.trim() || null,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
      verifyToken: env.WHATSAPP_VERIFY_TOKEN?.trim() || null,
      apiVersion: env.WHATSAPP_API_VERSION?.trim() || 'v21.0',
    },
    line: {
      channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN?.trim() || null,
      channelSecret: env.LINE_CHANNEL_SECRET?.trim() || null,
    },
    paymentsApiUrl: env.PAYMENTS_API_URL?.trim() || null,
    merchants,
    fxRates,
  };
}

export function toDomainMerchant(config: MerchantConfig): Merchant {
  return Merchant.create({
    id: config.id,
    displayName: config.displayName,
    language: config.language,
    currency: config.currency,
    channel: config.channel,
    channelAddress: config.address,
  });
}
