import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

import { loadConfig } from '../../src/infrastructure/config.js';
import { createContainer } from '../../src/interface/container.js';
import { buildApp } from '../../src/interface/http/app.js';

const ENV: NodeJS.ProcessEnv = {
  OMNILANG_DEMO_MODE: 'true',
  OMNILANG_PERSISTENCE: 'memory',
  CATALOG_BASE_URL: 'https://omnilang.test',
  WHATSAPP_VERIFY_TOKEN: 'test-verify-token',
  MERCHANTS_JSON: JSON.stringify([
    {
      id: 'm-001',
      displayName: 'Warung Sari',
      language: 'id',
      currency: 'IDR',
      channel: 'whatsapp',
      address: '6281234567890',
    },
  ]),
};

const container = createContainer(loadConfig(ENV));
const app = buildApp(container);

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function whatsappEvent(from: string, text: string, displayPhoneNumber = '6281234567890') {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { display_phone_number: displayPhoneNumber },
              messages: [{ from, type: 'text', text: { body: text } }],
            },
          },
        ],
      },
    ],
  };
}

describe('HTTP interface (demo mode)', () => {
  it('serves the health check', async () => {
    const response = await fetch(`${baseUrl}/healthz`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('completes the WhatsApp subscription handshake only with the right token', async () => {
    const ok = await fetch(
      `${baseUrl}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=abc123`,
    );
    expect(ok.status).toBe(200);
    await expect(ok.text()).resolves.toBe('abc123');

    const denied = await fetch(
      `${baseUrl}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123`,
    );
    expect(denied.status).toBe(403);
  });

  it('runs the buyer negotiation and close-deal flow end to end', async () => {
    const buyerEvent = whatsappEvent('819012345678', '5個購入希望です。東京までの送料は？');
    const inbound = await fetch(`${baseUrl}/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buyerEvent),
    });
    expect(inbound.status).toBe(200);

    const negotiation = await container.negotiations.findActiveByBuyer('whatsapp', '819012345678');
    expect(negotiation).not.toBeNull();
    expect(negotiation!.buyerLanguage).toBe('ja');
    expect(negotiation!.merchantLanguage).toBe('id');

    const closed = await fetch(`${baseUrl}/api/negotiations/${negotiation!.id}/close-deal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity: 5,
        unitPriceAmount: 75_000,
        unitPriceCurrency: 'IDR',
        shippingCostAmount: 120_000,
      }),
    });
    expect(closed.status).toBe(201);

    const order = (await closed.json()) as {
      total: { amount: number; currency: string };
      paymentUrl: string;
      invoiceId: string;
    };
    expect(order.total).toEqual({ amount: 495_000, currency: 'IDR' });
    expect(order.paymentUrl).toMatch(/^https:\/\/omnilang\.test\/pay\/demo-inv-/);
    expect(order.invoiceId).toMatch(/^demo-inv-/);
  });

  it('rejects invalid close-deal payloads with 400', async () => {
    const response = await fetch(`${baseUrl}/api/negotiations/does-not-matter/close-deal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: -1 }),
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 for unknown negotiations and listings', async () => {
    const close = await fetch(`${baseUrl}/api/negotiations/ghost/close-deal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity: 1,
        unitPriceAmount: 75_000,
        unitPriceCurrency: 'IDR',
        shippingCostAmount: 0,
      }),
    });
    expect(close.status).toBe(404);
    await expect(close.json()).resolves.toMatchObject({ error: expect.stringContaining('ghost') });

    const catalog = await fetch(`${baseUrl}/catalog/ghost`);
    expect(catalog.status).toBe(404);
  });

  it('reports LINE as unconfigured without credentials', async () => {
    const response = await fetch(`${baseUrl}/webhooks/line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [] }),
    });
    expect(response.status).toBe(404);
  });
});
