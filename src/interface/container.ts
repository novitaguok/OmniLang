import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

import type { ListingRepository } from '../application/ports/listing-repository.js';
import type { NegotiationRepository } from '../application/ports/negotiation-repository.js';
import type { OrderRepository } from '../application/ports/order-repository.js';
import { CatalogProductPhotoUseCase } from '../application/use-cases/catalog-product-photo.js';
import { RelayChatMessageUseCase } from '../application/use-cases/relay-chat-message.js';
import { CloseDealUseCase } from '../application/use-cases/close-deal.js';
import { MissingConfigurationError } from '../application/errors.js';
import type { MerchantDirectory } from '../application/ports/merchant-directory.js';
import type { OmniLangConfig } from '../infrastructure/config.js';
import { loadConfig } from '../infrastructure/config.js';
import { InMemoryRepositories } from '../infrastructure/persistence/in-memory-repositories.js';
import { FirestoreRepositories } from '../infrastructure/persistence/firestore-repositories.js';
import { GcsMediaStore } from '../infrastructure/media/gcs-media-store.js';
import { DemoMediaStore } from '../infrastructure/media/demo-media-store.js';
import { GeminiVisionCataloger } from '../infrastructure/ai/gemini-vision-cataloger.js';
import { DemoVisionCataloger } from '../infrastructure/ai/demo-vision-cataloger.js';
import { VertexDialectTranslator } from '../infrastructure/translation/vertex-dialect-translator.js';
import { PassthroughDialectTranslator } from '../infrastructure/translation/passthrough-translator.js';
import { WhatsAppClient } from '../infrastructure/channels/whatsapp-client.js';
import { LineClient } from '../infrastructure/channels/line-client.js';
import { MultiChannelMessenger } from '../infrastructure/channels/multi-channel-messenger.js';
import { ConsoleMessenger } from '../infrastructure/channels/console-messenger.js';
import { HttpPaymentProvider } from '../infrastructure/payments/http-payment-provider.js';
import { DemoPaymentProvider } from '../infrastructure/payments/demo-payment-provider.js';
import { ConfiguredExchangeRateProvider } from '../infrastructure/rates/configured-exchange-rate-provider.js';
import { StaticMerchantDirectory } from '../infrastructure/directory/static-merchant-directory.js';

/**
 * Composition root. Wires concrete adapters from the infrastructure layer
 * into the application ports — the only place where both layers meet.
 */
export interface Container {
  readonly config: OmniLangConfig;
  readonly merchants: MerchantDirectory;
  readonly catalogProductPhoto: CatalogProductPhotoUseCase;
  readonly relayChatMessage: RelayChatMessageUseCase;
  readonly closeDeal: CloseDealUseCase;
  readonly listings: ListingRepository;
  readonly negotiations: NegotiationRepository;
  readonly orders: OrderRepository;
  readonly whatsappClient: WhatsAppClient | null;
  readonly lineClient: LineClient | null;
  readonly consoleMessenger: ConsoleMessenger;
}

export function createContainer(config: OmniLangConfig = loadConfig()): Container {
  const merchants = new StaticMerchantDirectory(config.merchants);

  const repositories =
    config.persistence === 'firestore'
      ? new FirestoreRepositories(new Firestore())
      : new InMemoryRepositories();

  const visionCataloger = config.demoMode
    ? new DemoVisionCataloger()
    : new GeminiVisionCataloger({
        model: config.gemini.model,
        apiKey: config.gemini.apiKey,
        googleCloud: config.googleCloud,
      });

  const translator = config.demoMode
    ? new PassthroughDialectTranslator()
    : new VertexDialectTranslator(config.googleCloud);

  const mediaStore = config.storageBucket
    ? new GcsMediaStore(config.storageBucket, new Storage())
    : config.demoMode
      ? new DemoMediaStore()
      : (() => {
          throw new MissingConfigurationError(
            'Product photo storage requires GOOGLE_CLOUD_STORAGE_BUCKET (or set OMNILANG_DEMO_MODE=true).',
          );
        })();

  const payments = config.paymentsApiUrl
    ? new HttpPaymentProvider(config.paymentsApiUrl)
    : new DemoPaymentProvider(config.catalogBaseUrl);

  const whatsappClient =
    config.whatsapp.accessToken && config.whatsapp.phoneNumberId
      ? new WhatsAppClient(config.whatsapp.phoneNumberId, config.whatsapp.accessToken, config.whatsapp.apiVersion)
      : null;
  const lineClient =
    config.line.channelAccessToken && config.line.channelSecret
      ? new LineClient(config.line.channelAccessToken, config.line.channelSecret)
      : null;

  const consoleMessenger = new ConsoleMessenger();
  const messenger =
    whatsappClient || lineClient ? new MultiChannelMessenger(whatsappClient, lineClient) : consoleMessenger;

  const exchangeRates = new ConfiguredExchangeRateProvider(config.fxRates);

  return {
    config,
    merchants,
    catalogProductPhoto: new CatalogProductPhotoUseCase({
      merchants,
      visionCataloger,
      mediaStore,
      exchangeRates,
      listings: repositories,
      messenger,
      catalogBaseUrl: config.catalogBaseUrl,
    }),
    relayChatMessage: new RelayChatMessageUseCase({
      merchants,
      negotiations: repositories,
      listings: repositories,
      translator,
      messenger,
    }),
    closeDeal: new CloseDealUseCase({
      negotiations: repositories,
      orders: repositories,
      listings: repositories,
      payments,
      translator,
      messenger,
    }),
    listings: repositories,
    negotiations: repositories,
    orders: repositories,
    whatsappClient,
    lineClient,
    consoleMessenger,
  };
}
