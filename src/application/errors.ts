/**
 * Application-level errors. They describe orchestration failures (missing
 * aggregates, unresolvable context) rather than invariant violations.
 */
export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Requested aggregate does not exist. */
export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message);
  }
}

export class NegotiationNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Negotiation '${id}' was not found`);
  }
}

export class MerchantNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super(`Merchant '${identifier}' was not found`);
  }
}

export class ListingNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Listing '${id}' was not found`);
  }
}

/** Required infrastructure configuration is missing. */
export class MissingConfigurationError extends ApplicationError {
  constructor(message: string) {
    super(message);
  }
}
