import type { CurrencyCode } from '../../domain/value-objects/money.js';

/**
 * Port: supplies exchange rates. A rate is expressed as target units per
 * one unit of the base currency (e.g. USD per 1 IDR).
 */
export interface ExchangeRateProvider {
  getRates(base: CurrencyCode): Promise<ReadonlyMap<CurrencyCode, number>>;
}
