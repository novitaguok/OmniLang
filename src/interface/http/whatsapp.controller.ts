import type { Request, Response } from 'express';
import { z } from 'zod';

import type { CatalogProductPhotoUseCase } from '../../application/use-cases/catalog-product-photo.js';
import type { RelayChatMessageUseCase } from '../../application/use-cases/relay-chat-message.js';
import type { MerchantDirectory } from '../../application/ports/merchant-directory.js';
import type { DownloadedMedia } from '../../infrastructure/channels/whatsapp-client.js';

const whatsappEventSchema = z.object({
  object: z.string(),
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z.object({
                metadata: z.object({ display_phone_number: z.string() }).optional(),
                messages: z
                  .array(
                    z.object({
                      from: z.string(),
                      type: z.string(),
                      text: z.object({ body: z.string() }).optional(),
                      image: z.object({ id: z.string(), caption: z.string().optional() }).optional(),
                      audio: z.object({ id: z.string() }).optional(),
                    }),
                  )
                  .optional(),
              }),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export interface WhatsAppControllerDeps {
  readonly verifyToken: string;
  readonly merchants: MerchantDirectory;
  readonly catalogProductPhoto: CatalogProductPhotoUseCase;
  readonly relayChatMessage: RelayChatMessageUseCase;
  /** Media downloader; null when WhatsApp credentials are not configured. */
  readonly mediaDownloader: ((mediaId: string) => Promise<DownloadedMedia>) | null;
  readonly replyFallback: (to: string, text: string) => Promise<void>;
}

/**
 * WhatsApp Business Cloud API webhook. Verifies the subscription handshake,
 * then routes every inbound message:
 *   - merchant photo  -> photo-to-catalog use case
 *   - merchant text   -> negotiation relay (merchant -> buyer)
 *   - buyer anything  -> negotiation relay (buyer -> merchant)
 * Always answers 200 fast so the channel does not retry.
 */
export class WhatsAppController {
  constructor(private readonly deps: WhatsAppControllerDeps) {}

  /** GET /webhooks/whatsapp — subscription verification handshake. */
  verify(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === this.deps.verifyToken) {
      res.status(200).send(String(challenge ?? ''));
      return;
    }
    res.status(403).send('Verification failed');
  }

  /** POST /webhooks/whatsapp — inbound message events. */
  async handleEvents(req: Request, res: Response): Promise<void> {
    const parsed = whatsappEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.sendStatus(200);
      return;
    }

    for (const entry of parsed.data.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const merchantAddress = change.value.metadata?.display_phone_number ?? null;
        for (const message of change.value.messages ?? []) {
          await this.dispatch(message, merchantAddress);
        }
      }
    }
    res.sendStatus(200);
  }

  private async dispatch(
    message: {
      from: string;
      type: string;
      text?: { body: string };
      image?: { id: string; caption?: string };
      audio?: { id: string };
    },
    merchantAddress: string | null,
  ): Promise<void> {
    const sender = await this.deps.merchants.findByChannelAddress('whatsapp', message.from);

    if (message.type === 'image' && message.image) {
      if (sender) {
        if (!this.deps.mediaDownloader) {
          await this.deps.replyFallback(message.from, 'Media support is not configured on this deployment.');
          return;
        }
        const media = await this.deps.mediaDownloader(message.image.id);
        await this.deps.catalogProductPhoto.execute({
          merchantId: sender.id,
          photo: { data: media.data, mimeType: media.mimeType },
          merchantNote: message.image.caption ?? '',
        });
      } else {
        await this.deps.relayChatMessage.execute({
          channel: 'whatsapp',
          senderAddress: message.from,
          text: message.image.caption ?? '(photo)',
          merchantAddress: merchantAddress ?? undefined,
        });
      }
      return;
    }

    if (message.type === 'text' && message.text) {
      await this.deps.relayChatMessage.execute({
        channel: 'whatsapp',
        senderAddress: message.from,
        text: message.text.body,
        merchantAddress: merchantAddress ?? undefined,
      });
      return;
    }

    if (message.type === 'audio') {
      await this.deps.replyFallback(
        message.from,
        'Voice notes are coming soon! For now, please type your message — I translate it instantly.',
      );
    }
  }
}
