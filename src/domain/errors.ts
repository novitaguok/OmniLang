/**
 * Base class for all domain errors. Domain errors express invariant
 * violations and illegal state transitions that are meaningful to the
 * business, independent of any transport or framework.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when entity or value-object invariants are violated. */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** Thrown when a negotiation is asked to move to a stage its state machine disallows. */
export class InvalidTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`Illegal transition from '${from}' to '${to}'`);
  }
}

/** Thrown when a language or currency code is outside the supported set. */
export class UnsupportedLocaleError extends DomainError {
  constructor(value: string, kind: 'language' | 'currency') {
    super(`Unsupported ${kind}: '${value}'`);
  }
}
