# OmniLang

**OmniLang SME Commerce Agent** — multimodal, multilingual conversational commerce for JAPAC micro-SMEs (warungs, sari-sari stores, artisans) on WhatsApp and LINE.

A merchant snaps a product photo and dictates a short note in their own dialect. Gemini turns it into a polished, SEO-optimized global listing with multi-currency pricing. International buyers negotiate in their own language through a dialect-aware translation bridge, and accepted chats convert into digital orders with cross-border payment links.

## Features

- **Multimodal Photo Catalog Generator** — Gemini 2.5 Flash inspects the craft (materials, colors, style) from a raw smartphone photo and generates marketplace-ready titles, descriptions, tags, care instructions and estimated dimensions. Colloquial price notes (`"jual 75rb per buah"`) are parsed deterministically and snapshotted into USD/JPY/SGD conversions.
- **Real-Time Dialect Negotiation Bridge** — bi-directional translation between merchant and buyer languages (Bahasa Indonesia, Tagalog/Filipino, Hindi, Vietnamese, Japanese, English), preserving colloquialisms and commercial intent. Full deal history (turns, agreements, order intent) is retained across turns.
- **Automated Order Closing & Invoicing** — an accepted chat becomes a digital order with a payment link; both sides receive the confirmation translated into their own language.
- **Multi-channel** — WhatsApp Business Cloud API and LINE Messaging API webhooks, with signature/verification handling.

## Architecture

Clean architecture with a strict dependency rule — outer layers depend on inner layers, never the reverse:

```
src/
├── domain/            # Enterprise business rules
│   ├── entities/      # Merchant, Listing, Negotiation (state machine), Order
│   ├── value-objects/ # Money, LanguageCode, Channel
│   ├── services/      # price-hint parsing for colloquial JAPAC notes
│   └── errors.ts      # DomainError, ValidationError, InvalidTransitionError...
├── application/       # Use cases, ports (interfaces), application errors
│   ├── ports/         # VisionCataloger, DialectTranslator, MediaStore,
│   │                  # PaymentProvider, repositories, MerchantDirectory...
│   └── use-cases/     # CatalogProductPhoto, RelayChatMessage, CloseDeal
├── infrastructure/    # Adapters implementing the ports
│   ├── ai/            # Gemini vision cataloger (+ demo fallback)
│   ├── translation/   # Vertex AI Translation adapter (+ passthrough)
│   ├── persistence/   # Firestore repositories, in-memory repositories
│   ├── channels/      # WhatsApp Cloud API, LINE Messaging API clients
│   ├── media/         # Cloud Storage media store
│   ├── payments/      # Generic HTTP invoice gateway
│   └── ...
└── interface/         # HTTP layer (Express on Cloud Run)
    ├── http/          # Webhook controllers, REST API, error middleware
    └── container.ts   # Composition root (dependency injection)
```

The domain and application layers have **zero** framework or cloud dependencies — every external concern (Gemini, Vertex AI, Firestore, GCS, WhatsApp/LINE, payments) sits behind a port and is swappable without touching business logic.

### Negotiation lifecycle

Mirrors the Dialogflow CX state machine: `INQUIRY → OFFER ⇄ OFFER → SHIPPING → INVOICED → PAID`, with every relayed turn recorded on the aggregate for context preservation.

## How to run

Requires Node.js ≥ 22 (npm ≥ 10).

### 1. Install and verify

```bash
npm install --include=dev
npm run typecheck   # strict TS, both src and tests
npm test            # 51 tests, no cloud credentials needed
npm run build       # emits dist/
```

### 2. Run locally in demo mode (no cloud credentials)

Demo mode wires deterministic in-process adapters for vision, translation,
media, persistence and payments, so the full product flow runs on your laptop.
Outbound messages print to the console instead of WhatsApp/LINE.

```bash
export OMNILANG_DEMO_MODE=true
export PORT=8080
export CATALOG_BASE_URL=http://localhost:8080
export MERCHANTS_JSON='[{"id":"m-001","displayName":"Warung Sari","language":"id","currency":"IDR","channel":"whatsapp","address":"6281234567890"}]'

npm run dev
# -> [omnilang] listening on :8080 (demo mode, memory persistence)
```

> `MERCHANTS_JSON` is how shops are onboarded: one config entry per merchant
> (language, currency, channel, address). Onboarding a new shop is a config
> change — operational in under a minute.

With the server up, walk the full journey — listing, negotiation, invoice:

```bash
# health check
curl -s localhost:8080/healthz
# {"status":"ok"}

# 1) create a listing from a product photo + colloquial price note
#    (any base64 image works in demo mode; the note drives the demo analysis)
curl -s -X POST localhost:8080/api/merchants/m-001/listings \
  -H 'content-type: application/json' \
  -d '{"imageBase64":"<base64-image>","note":"Ini batik tulis Pekalongan, mau jual 150.000 per lembar"}'
# -> 201 { "id": "...", "title": "Hand-Dyed Batik Textile Art (Pekalongan Style)",
#          "basePrice": { "amount": 150000, "currency": "IDR" }, ... }
# console shows the preview sent to the merchant incl. USD/JPY/SGD conversions

# 2) simulate a Tokyo buyer messaging the merchant's WhatsApp number
curl -s -X POST localhost:8080/webhooks/whatsapp \
  -H 'content-type: application/json' \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"metadata":{"display_phone_number":"6281234567890"},"messages":[{"from":"819012345678","type":"text","text":{"body":"5個購入希望です。東京までの送料は？"}}]}}]}]}'
# -> 200; console shows the inquiry translated into the merchant's dialect

# 3) inspect the merchant's open negotiations
curl -s localhost:8080/api/merchants/m-001/negotiations
# -> [{ "id": "<negotiationId>", "stage": "INQUIRY", "buyerLanguage": "ja", ... }]

# 4) close the deal: quantity, unit price, shipping
curl -s -X POST localhost:8080/api/negotiations/<negotiationId>/close-deal \
  -H 'content-type: application/json' \
  -d '{"quantity":5,"unitPriceAmount":75000,"unitPriceCurrency":"IDR","shippingCostAmount":120000}'
# -> 201 { "total": { "amount": 495000, "currency": "IDR" }, "paymentUrl": "..." }
# console shows the invoice summary translated to Japanese (buyer)
# and to Bahasa (merchant), each with the payment link

# fetch any published listing
curl -s localhost:8080/catalog/<listingId>
```

### 3. Run against real Google Cloud (production mode)

```bash
npm run build
npm start
```

The runtime adapters are selected by environment variables (see `.env.example`
for the full list):

| Concern | Adapter | Configuration |
|---|---|---|
| Vision catalog | Gemini via `@google/genai` | `GEMINI_API_KEY` or `GCP_PROJECT` + `GCP_LOCATION` |
| Translation | Vertex AI Translation API | `GCP_PROJECT` + `GCP_LOCATION` |
| Persistence | Firestore (native mode) | `OMNILANG_PERSISTENCE=firestore` |
| Media | Cloud Storage | `GOOGLE_CLOUD_STORAGE_BUCKET` |
| WhatsApp | Business Cloud API | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` |
| LINE | Messaging API | `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET` |
| Payments | Generic invoice gateway | `PAYMENTS_API_URL` |

> Firestore composite indexes required:
> `(channel ASC, buyerAddress ASC, stage ASC, updatedAt DESC)`,
> `(channel ASC, merchantAddress ASC, stage ASC, updatedAt DESC)` and
> `(merchantId ASC, updatedAt DESC)` — deploy via `firestore.indexes.json`
> when enabling Firestore mode.

## HTTP surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Liveness probe (Cloud Run) |
| GET | `/webhooks/whatsapp` | WhatsApp subscription handshake |
| POST | `/webhooks/whatsapp` | Inbound WhatsApp messages (photos + text) |
| POST | `/webhooks/line` | Inbound LINE messages (HMAC-verified) |
| GET | `/catalog/:listingId` | Public listing JSON |
| POST | `/api/merchants/:merchantId/listings` | Photo-to-catalog (API entry, e.g. dashboards/bulk tools) |
| GET | `/api/merchants/:merchantId/negotiations` | Negotiation summaries for the merchant |
| POST | `/api/negotiations/:negotiationId/close-deal` | Freeze a deal, issue the invoice |

```jsonc
// POST /api/negotiations/:id/close-deal
{
  "quantity": 5,
  "unitPriceAmount": 75000,
  "unitPriceCurrency": "IDR",
  "shippingCostAmount": 120000
}
// -> 201 { orderId, negotiationId, quantity, total, invoiceId, paymentUrl }
```

## Testing

51 tests across three levels, all runnable without cloud credentials:

```bash
npm test
```

- **Domain** — Money arithmetic/conversion, colloquial price-hint parsing (`75rb`, `Rp 150.000`, `5k` vs. quantity chatter), negotiation state machine, order invariants, listing validation, snapshot round-trips.
- **Application** — the three use cases against in-memory fakes: photo → published listing with USD/JPY/SGD snapshot, missing-price guidance, dialect relay with turn recording, deal closing with bilingual notifications.
- **Interface** — the full HTTP stack in demo mode: webhook handshake, listing creation via the merchant API, buyer negotiation open, end-to-end close-deal, error mapping (400/404).

## Deploying to Cloud Run

```bash
gcloud run deploy omnilang \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars "OMNILANG_PERSISTENCE=firestore,GCP_PROJECT=your-project,GCP_LOCATION=asia-southeast1,GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket,WHATSAPP_ACCESS_TOKEN=...,WHATSAPP_PHONE_NUMBER_ID=...,WHATSAPP_VERIFY_TOKEN=...,CATALOG_BASE_URL=https://your-domain"
```

Then point the WhatsApp webhook to `https://<service-url>/webhooks/whatsapp` and the LINE webhook to `https://<service-url>/webhooks/line`.
