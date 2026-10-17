import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { ZodError, z } from 'zod';

import { DomainError, ValidationError } from '../../domain/errors.js';
import { ApplicationError, NotFoundError, MissingConfigurationError } from '../../application/errors.js';
import { InfrastructureError } from '../../infrastructure/errors.js';

/** Wraps an async handler so rejections reach the error middleware. */
export function asyncRoute<P = ParamsDictionary>(
  handler: (req: Request<P>, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler<P> {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/**
 * Maps domain and application errors onto HTTP responses. Transport details
 * never leak into the domain — this is where they meet.
 */
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request payload', details: err.issues.map((issue) => issue.message) });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof MissingConfigurationError) {
    res.status(503).json({ error: err.message });
    return;
  }
  if (err instanceof InfrastructureError) {
    res.status(502).json({ error: 'Upstream service failure', details: err.message });
    return;
  }
  if (err instanceof ValidationError) {
    res.status(422).json({ error: err.message });
    return;
  }
  if (err instanceof DomainError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof ApplicationError) {
    res.status(409).json({ error: err.message });
    return;
  }
  console.error('[omnilang] unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
}

export const closeDealBodySchema = z.object({
  quantity: z.number().int().positive(),
  unitPriceAmount: z.number().int().nonnegative(),
  unitPriceCurrency: z.string().min(3).max(3),
  shippingCostAmount: z.number().int().nonnegative(),
});
