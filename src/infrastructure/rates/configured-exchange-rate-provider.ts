import type { CurrencyCode } from '../../domain/value-objects/money.js';
import { SUPPORTED_CURRENCIES } from '../../domain/value-objects/money.js';
import type { ExchangeRateProvider } from '../../application/ports/exchange-rate-provider.js';

/**
 * Config-driven FX rate provider (target units per 1 IDR by default).
 * Rates are loaded from FX_RATES_JSON; this static-table approach fits the
 * prototype cost model — swap in a live rate feed adapter in production.
 */
export class ConfiguredExchangeRateProvider implements ExchangeRateProvider {
  constructor(private readonly rates: Readonly<Record<string, number>>) {}

  async getRates(base: CurrencyCode): Promise<ReadonlyMap<CurrencyCode, number>> {
    const rates = new Map<CurrencyCode, number>();
    if (base === 'IDR') {
      for (const currency of SUPPORTED_CURRENCIES) {
        const rate = this.rates[currency];
        if (typeof rate === 'number' && rate > 0) {
          rates.set(currency, rate);
        }
      }
    }
    return rates;
  }
}
