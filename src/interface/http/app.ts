import express, { type Express, type Request } from 'express';

import type { Container } from '../container.js';
import { WhatsAppController } from './whatsapp.controller.js';
import { LineController } from './line.controller.js';
import { ApiController } from './api.controller.js';
import { DemoController } from './demo.controller.js';
import { errorMiddleware, asyncRoute } from './middleware.js';
import type { DownloadedMedia } from '../../infrastructure/channels/whatsapp-client.js';

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
  }
}

/**
 * HTTP layer for Cloud Run: WhatsApp/LINE webhooks, the public catalog and
 * the deal-closing API. The raw request body is retained for the LINE
 * signature check.
 */
export function buildApp(container: Container): Express {
  const app = express();

  app.use(
    express.json({
      limit: '1mb',
      verify: (req: Request, _res, buffer) => {
        req.rawBody = Buffer.isBuffer(buffer) ? buffer : undefined;
      },
    }),
  );

  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'OmniLang SME Commerce Agent',
      status: 'ok',
      version: '0.1.0',
      demoUrl: '/demo',
    });
  });

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const consoleFallback = container.consoleMessenger;
  const whatsappMediaDownloader: ((mediaId: string) => Promise<DownloadedMedia>) | null =
    container.whatsappClient
      ? (mediaId: string) => container.whatsappClient!.downloadMedia(mediaId)
      : null;

  const whatsapp = new WhatsAppController({
    verifyToken: container.config.whatsapp.verifyToken ?? 'omnilang-verify-token',
    merchants: container.merchants,
    catalogProductPhoto: container.catalogProductPhoto,
    relayChatMessage: container.relayChatMessage,
    mediaDownloader: whatsappMediaDownloader,
    replyFallback: (to, text) => consoleFallback.send({ channel: 'whatsapp', to, text }),
  });

  app.get('/webhooks/whatsapp', (req, res) => whatsapp.verify(req, res));
  app.post('/webhooks/whatsapp', asyncRoute(async (req, res) => whatsapp.handleEvents(req, res)));

  if (container.lineClient) {
    const line = new LineController({
      line: container.lineClient,
      merchants: container.merchants,
      catalogProductPhoto: container.catalogProductPhoto,
      relayChatMessage: container.relayChatMessage,
      replyFallback: (to, text) => consoleFallback.send({ channel: 'line', to, text }),
    });
    app.post('/webhooks/line', asyncRoute(async (req, res) => line.handleEvents(req, res)));
  } else {
    app.post('/webhooks/line', (_req, res) => {
      res.status(404).json({ error: 'LINE channel is not configured on this deployment' });
    });
  }

  const api = new ApiController({
    listings: container.listings,
    negotiations: container.negotiations,
    closeDeal: container.closeDeal,
    catalogProductPhoto: container.catalogProductPhoto,
  });

  app.get(
    '/catalog/:listingId',
    asyncRoute(async (req: Request<{ listingId: string }>, res) => api.getListing(req, res)),
  );
  app.post(
    '/api/merchants/:merchantId/listings',
    asyncRoute(async (req: Request<{ merchantId: string }>, res) => api.createListing(req, res)),
  );
  app.get(
    '/api/merchants/:merchantId/negotiations',
    asyncRoute(async (req: Request<{ merchantId: string }>, res) => api.listNegotiations(req, res)),
  );
  app.post(
    '/api/negotiations/:negotiationId/close-deal',
    asyncRoute(async (req: Request<{ negotiationId: string }>, res) => api.closeDeal(req, res)),
  );

  const demo = new DemoController(container);
  app.get('/demo', (req, res) => demo.serveDemoStudio(req, res));
  app.get('/api/demo/state', asyncRoute(async (req, res) => demo.getState(req, res)));
  app.post('/api/demo/reset', asyncRoute(async (req, res) => demo.resetState(req, res)));
  app.post(
    '/api/demo/negotiations/:negotiationId/pay',
    asyncRoute(async (req: Request<{ negotiationId: string }>, res) => demo.markPaid(req, res)),
  );
  app.get(
    '/p/:listingId',
    asyncRoute(async (req: Request<{ listingId: string }>, res) => demo.servePublicListing(req, res)),
  );
  app.get(
    '/pay/:invoiceId',
    asyncRoute(async (req: Request<{ invoiceId: string }>, res) => demo.servePaymentCheckout(req, res)),
  );

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorMiddleware);

  return app;
}
