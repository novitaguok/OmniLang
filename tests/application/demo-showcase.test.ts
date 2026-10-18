import { describe, expect, it } from 'vitest';

import { DemoVisionCataloger } from '../../src/infrastructure/ai/demo-vision-cataloger.js';
import { PassthroughDialectTranslator } from '../../src/infrastructure/translation/passthrough-translator.js';
import { ConfiguredExchangeRateProvider } from '../../src/infrastructure/rates/configured-exchange-rate-provider.js';
import { loadConfig } from '../../src/infrastructure/config.js';
import { createContainer } from '../../src/interface/container.js';

describe('JAPAC Demo Showcase Adapters & Container', () => {
  it('seeds all 3 JAPAC demo merchants (Indonesia, Philippines, India) in demo mode by default', async () => {
    const config = loadConfig({ OMNILANG_DEMO_MODE: 'true' });
    const container = createContainer(config);

    await expect(container.merchants.findById('m-001')).resolves.toMatchObject({
      language: 'id',
      currency: 'IDR',
    });
    await expect(container.merchants.findById('m-002')).resolves.toMatchObject({
      language: 'tl',
      currency: 'PHP',
    });
    await expect(container.merchants.findById('m-003')).resolves.toMatchObject({
      language: 'hi',
      currency: 'INR',
    });
  });

  it('produces dialect-specific craft analyses for Batik, Ilocos Inabel, and Jaipur Block Print', async () => {
    const cataloger = new DemoVisionCataloger();
    const fakePhoto = { data: Buffer.from('photo'), mimeType: 'image/jpeg' };

    const batik = await cataloger.analyze(fakePhoto, 'Ini batik tulis Pekalongan 150.000', 'id');
    expect(batik.title).toContain('Batik');

    const inabel = await cataloger.analyze(fakePhoto, 'Inabel blanket mula Ilocos, 1,200', 'tl');
    expect(inabel.title).toContain('Inabel');

    const jaipur = await cataloger.analyze(fakePhoto, 'यह जयपुर की ब्लॉक प्रिंट चादर है, 1,500', 'hi');
    expect(jaipur.title).toContain('Jaipur');
  });

  it('translates Tokyo buyer inquiries and invoice summaries into natural Bahasa, Tagalog, Hindi, and Japanese', async () => {
    const translator = new PassthroughDialectTranslator();

    const idInquiry = await translator.translate('5個購入希望です。東京までの送料は？', 'ja', 'id');
    expect(idInquiry).toContain('Ongkir ke Tokyo');

    const jaOffer = await translator.translate(
      'Siap kak! 5 lembar stok ada. Kalau ambil 5 saya kasih diskon jadi 135rb/lembar. Ongkir EMS ke Tokyo Rp 120.000 ya',
      'id',
      'ja',
    );
    expect(jaOffer).toContain('135,000ルピア');

    const jaInvoice = await translator.translate(
      'Order confirmed! 5 × Hand-Dyed Batik\nUnit price: Rp135,000 IDR\nShipping: Rp120,000 IDR\nTotal: Rp795,000 IDR\nPay securely: https://omnilang.test/pay/inv-1',
      'en',
      'ja',
    );
    expect(jaInvoice).toContain('ご注文が確定しました');
    expect(jaInvoice).toContain('https://omnilang.test/pay/inv-1');
  });

  it('computes cross-currency FX rates for PHP and INR listings', async () => {
    const fx = new ConfiguredExchangeRateProvider({
      USD: 0.000064,
      JPY: 0.0098,
      SGD: 0.000084,
      PHP: 0.0033,
      INR: 0.0054,
    });

    const phpRates = await fx.getRates('PHP');
    expect(phpRates.get('USD')).toBeGreaterThan(0.01);

    const inrRates = await fx.getRates('INR');
    expect(inrRates.get('USD')).toBeGreaterThan(0.01);
  });
});
