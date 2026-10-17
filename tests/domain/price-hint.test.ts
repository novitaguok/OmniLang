import { describe, expect, it } from 'vitest';

import { parsePriceHint } from '../../src/domain/services/price-hint.js';

describe('parsePriceHint', () => {
  it.each([
    ['Ini keranjang rotan asli, mau jual 75rb per buah', 75_000],
    ['jual 75 rb aja', 75_000],
    ['Batik Pekalongan 150ribu', 150_000],
    ['5k each', 5_000],
    ['1,5rb negotiable', 1_500],
  ])('parses suffix multipliers: %s', (text, expected) => {
    expect(parsePriceHint(text)).toBe(expected);
  });

  it.each([
    ['Rp 150.000', 150_000],
    ['75,000 per piece', 75_000],
    ['1.250.000 untuk set', 1_250_000],
  ])('parses grouped thousands: %s', (text, expected) => {
    expect(parsePriceHint(text)).toBe(expected);
  });

  it.each([
    ['Rp 75000', 75_000],
    ['harga 50000', 50_000],
  ])('parses plain large numbers: %s', (text, expected) => {
    expect(parsePriceHint(text)).toBe(expected);
  });

  it('ignores quantity chatter that must never become a price', () => {
    expect(parsePriceHint('5 pcs available')).toBeNull();
    expect(parsePriceHint('buy 3 get 1')).toBeNull();
    expect(parsePriceHint('')).toBeNull();
    expect(parsePriceHint('mau jual')).toBeNull();
  });
});
