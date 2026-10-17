# OmniLang

OmniLang SME Commerce Agent — multimodal, multilingual conversational commerce for JAPAC micro-SMEs (warungs, sari-sari stores, artisans) on WhatsApp and LINE.

Merchants snap a product photo, Gemini turns it into a polished global listing, buyers negotiate in their own language through a dialect-aware translation bridge, and accepted chats convert into invoices with payment links.

## Stack

- Node.js 24 + TypeScript (strict)
- Google Cloud Run, Firestore, Cloud Storage
- Gemini (multimodal photo-to-catalog), Vertex AI Translation (dialect bridge)

## Repository layout

Clean architecture with a strict dependency rule (outer layers depend on inner layers, never the reverse):

- `src/domain` — entities, value objects, domain services, domain errors
- `src/application` — use cases and ports (interfaces) the outer layers implement
- `src/infrastructure` — adapters: Gemini, Vertex AI Translation, Firestore, GCS, WhatsApp/LINE, payments
- `src/interface` — HTTP layer: webhooks, API routes, dependency-injection container
