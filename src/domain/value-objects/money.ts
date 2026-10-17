import { DomainError, UnsupportedLocaleError } from '../errors.js';

/**
 * Currency codes used across JAPAC merchant markets plus the global
 * buyer-facing conversion targets (USD / JPY / SGD).
 */
export const SUPPORTED_CURRENCIES = [
  'IDR',
  'PHP',
  'INR',
  'VND',
  'JPY',
  'SGD',
  'USD',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function assertCurrencyCode(value: string): CurrencyCode {
  if (!isCurrencyCode(value)) {
    throw new UnsupportedLocaleError(value, 'currency');
  }
  return value;
}

/**
 * An integer amount in a currency's major units (e.g. whole rupiah).
 * Zero-decimal currencies such as IDR, VND and JPY are first-class.
 */
export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: CurrencyCode,
  ) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new DomainError(`Money amount must be a non-negative finite number, got '${amount}'`);
    }
    if (!Number.isInteger(amount)) {
      throw new DomainError(`Money amount must be a whole number of ${currency}, got '${amount}'`);
    }
  }

  static of(amount: number, currency: CurrencyCode): Money {
    return new Money(amount, currency);
  }

  static zero(currency: CurrencyCode): Money {
    return new Money(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other, 'add');
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(quantity: number): Money {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new DomainError(`Multiplier must be positive, got '${quantity}'`);
    }
    const product = this.amount * quantity;
    if (!Number.isInteger(product)) {
      throw new DomainError(`Multiplying ${this.amount} by ${quantity} produced a fractional amount`);
    }
    return new Money(product, this.currency);
  }

  /**
   * Convert into another currency using a rate expressed as target units
   * per one unit of this currency (e.g. USD per IDR).
   */
  convertTo(currency: CurrencyCode, rate: number): Money {
    if (currency === this.currency) {
      return this;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new DomainError(`Exchange rate must be positive, got '${rate}'`);
    }
    return new Money(Math.round(this.amount * rate), currency);
  }

  format(): string {
    return new Intl.NumberFormat('en', { style: 'currency', currency: this.currency }).format(this.amount);
  }

  private assertSameCurrency(other: Money, operation: string): void {
    if (other.currency !== this.currency) {
      throw new DomainError(`Cannot ${operation} ${this.currency} and ${other.currency}`);
    }
  }
}
