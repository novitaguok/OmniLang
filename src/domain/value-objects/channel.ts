/**
 * The messaging channels OmniLang operates on. Merchants and buyers never
 * install anything — they talk to the agent on the apps they already use.
 */
export type Channel = 'whatsapp' | 'line';

export const SUPPORTED_CHANNELS: readonly Channel[] = ['whatsapp', 'line'];

export function isChannel(value: unknown): value is Channel {
  return typeof value === 'string' && (SUPPORTED_CHANNELS as readonly string[]).includes(value);
}
