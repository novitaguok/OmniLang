import { describe, expect, it } from 'vitest';

import { Money } from '../../src/domain/value-objects/money.js';

describe('Money', () => {
  it('creates whole amounts', () => {
    const money = Money.of(75_000, 'IDR');
    expect(money.amount).toBe(75_000);
    expect(money.currency).toBe('IDR');
  });

  it('rejects fractional and negative amounts', () => {
    expect(() => Money.of(75_000.5, 'IDR')).toThrow();
    expect(() => Money.of(-1, 'IDR')).toThrow();
    expect(() => Money.of(Number.NaN, 'IDR')).toThrow();
  });

  it('adds same-currency amounts and rejects mixed currencies', () => {
    expect(Money.of(375_000, 'IDR').add(Money.of(120_000, 'IDR')).amount).toBe(495_000);
    expect(() => Money.of(375_000, 'IDR').add(Money.of(5, 'USD'))).toThrow();
  });

  it('multiplies by quantity', () => {
    expect(Money.of(75_000, 'IDR').multiply(5).amount).toBe(375_000);
    expect(() => Money.of(75_000, 'IDR').multiply(0)).toThrow();
  });

  it('converts to another currency with rounding', () => {
    const usd = Money.of(75_000, 'IDR').convertTo('USD', 0.000064);
    expect(usd.amount).toBe(5);
    expect(usd.currency).toBe('USD');
  });

  it('returns itself when converting to the same currency', () => {
    const idr = Money.of(75_000, 'IDR');
    expect(idr.convertTo('IDR', 0)).toBe(idr);
  });

  it('rejects non-positive exchange rates', () => {
    expect(() => Money.of(75_000, 'IDR').convertTo('USD', 0)).toThrow();
  });

  it('formats using Intl', () => {
    expect(Money.of(5, 'USD').format()).toBe('$5.00');
    expect(Money.of(750, 'JPY').format()).toBe('¥750');
  });
});
