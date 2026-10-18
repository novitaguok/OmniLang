import type { Request, Response } from 'express';

import { DEFAULT_DEMO_MERCHANTS } from '../../infrastructure/config.js';
import { StaticMerchantDirectory } from '../../infrastructure/directory/static-merchant-directory.js';
import { InMemoryRepositories } from '../../infrastructure/persistence/in-memory-repositories.js';
import type { Container } from '../container.js';
import { renderCatalogPageHtml, renderDemoStudioHtml, renderPaymentPageHtml } from './demo-ui.js';

/**
 * Interactive Demo Studio & Public Preview Controller:
 *   GET  /demo                       -> Split-screen 3-minute Video Demo Studio
 *   GET  /api/demo/state             -> Live snapshot of merchants, listings, negotiations, orders, outbox
 *   POST /api/demo/reset             -> Reset in-memory repositories & seed JAPAC merchants
 *   POST /api/demo/negotiations/:id/pay -> Advance an INVOICED negotiation to PAID
 *   GET  /p/:listingId               -> Public visual marketplace listing page
 *   GET  /pay/:invoiceId             -> Public cross-border checkout page
 */
export class DemoController {
  constructor(private readonly container: Container) {
    this.ensureDemoMerchants();
  }

  private ensureDemoMerchants(): void {
    if (this.container.merchants instanceof StaticMerchantDirectory) {
      for (const config of DEFAULT_DEMO_MERCHANTS) {
        const existing = this.container.merchants.listAll().find((m) => m.id === config.id);
        if (!existing) {
          this.container.merchants.register(config);
        }
      }
    }
  }

  serveDemoStudio(_req: Request, res: Response): void {
    this.ensureDemoMerchants();
    res.status(200).type('html').send(renderDemoStudioHtml());
  }

  async getState(_req: Request, res: Response): Promise<void> {
    this.ensureDemoMerchants();
    const merchants =
      this.container.merchants instanceof StaticMerchantDirectory
        ? this.container.merchants.listAll().map((m) => ({
            id: m.id,
            displayName: m.displayName,
            language: m.language,
            currency: m.currency,
            channel: m.channel,
            address: m.channelAddress,
          }))
        : [];

    const repos = this.container.listings instanceof InMemoryRepositories ? this.container.listings : null;
    const listings = repos ? repos.listAllListings().map((l) => l.toSnapshot()) : [];
    const negotiations = repos ? repos.listAllNegotiations().map((n) => n.toSnapshot()) : [];
    const orders = repos ? repos.listAllOrders().map((o) => o.toSnapshot()) : [];
    const outbox = this.container.consoleMessenger.listSent();

    res.status(200).json({
      mode: this.container.config.demoMode ? 'demo' : 'cloud',
      techStack: {
        visionModel: this.container.config.gemini.model,
        translationApi: 'Vertex AI Translation API (Dialect Bridge)',
        conversationalAgent: 'Dialogflow CX State Machine',
        runtime: 'Google Cloud Run + Firestore',
      },
      merchants,
      listings,
      negotiations,
      orders,
      outbox,
    });
  }

  async resetState(_req: Request, res: Response): Promise<void> {
    if (this.container.listings instanceof InMemoryRepositories) {
      this.container.listings.clear();
    }
    this.container.consoleMessenger.clear();
    this.ensureDemoMerchants();
    res.status(200).json({ status: 'reset' });
  }

  async markPaid(req: Request<{ negotiationId: string }>, res: Response): Promise<void> {
    const negotiation = await this.container.negotiations.findById(req.params.negotiationId);
    if (!negotiation) {
      res.status(404).json({ error: `Negotiation '${req.params.negotiationId}' not found` });
      return;
    }
    if (negotiation.stage === 'INVOICED') {
      negotiation.advanceTo('PAID');
      await this.container.negotiations.save(negotiation);
      await this.container.consoleMessenger.send({
        channel: negotiation.channel,
        to: negotiation.merchantAddress,
        text: `💸 Payment received! Order for negotiation ${negotiation.id.slice(0, 8)} is now PAID and ready to ship.`,
      });
      await this.container.consoleMessenger.send({
        channel: negotiation.channel,
        to: negotiation.buyerAddress,
        text: `✅ Payment confirmed! The artisan has been notified to dispatch your international shipment.`,
      });
    }
    res.status(200).json(negotiation.toSnapshot());
  }

  async servePublicListing(req: Request<{ listingId: string }>, res: Response): Promise<void> {
    const listing = await this.container.listings.findById(req.params.listingId);
    if (!listing) {
      res.status(404).type('html').send('<h1>Listing not found</h1>');
      return;
    }
    const merchant = await this.container.merchants.findById(listing.merchantId);
    res
      .status(200)
      .type('html')
      .send(renderCatalogPageHtml(listing.toSnapshot(), merchant?.displayName ?? 'JAPAC Artisan'));
  }

  async servePaymentCheckout(req: Request<{ invoiceId: string }>, res: Response): Promise<void> {
    const repos = this.container.orders instanceof InMemoryRepositories ? this.container.orders : null;
    const order = repos
      ? repos.listAllOrders().find((entry) => entry.invoiceId === req.params.invoiceId) ?? null
      : null;
    res
      .status(200)
      .type('html')
      .send(renderPaymentPageHtml(req.params.invoiceId, order ? order.toSnapshot() : null));
  }
}
