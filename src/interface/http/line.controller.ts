import type { Request, Response } from 'express';
import { z } from 'zod';

import type { CatalogProductPhotoUseCase } from '../../application/use-cases/catalog-product-photo.js';
import type { RelayChatMessageUseCase } from '../../application/use-cases/relay-chat-message.js';
import type { MerchantDirectory } from '../../application/ports/merchant-directory.js';
import type { LineClient } from '../../infrastructure/channels/line-client.js';

const lineEventSchema = z.object({
  events: z
    .array(
      z.object({
        type: z.string(),
        message: z
          .object({
            id: z.string(),
            type: z.string(),
            text: z.string().optional(),
          })
          .optional(),
        source: z.object({ userId: z.string().optional() }).optional(),
      }),
    )
    .optional(),
});

export interface LineControllerDeps {
  readonly line: LineClient;
  readonly merchants: MerchantDirectory;
  readonly catalogProductPhoto: CatalogProductPhotoUseCase;
  readonly relayChatMessage: RelayChatMessageUseCase;
  readonly replyFallback: (to: string, text: string) => Promise<void>;
}

/**
 * LINE Messaging API webhook. Rejects unsigned requests (constant-time
 * HMAC check), then routes text and image messages the same way WhatsApp is
 * handled: merchants catalog photos, everyone else relays into negotiations.
 */
export class LineController {
  constructor(private readonly deps: LineControllerDeps) {}

  async handleEvents(req: Request, res: Response): Promise<void> {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const signature = req.header('x-line-signature');

    if (!rawBody || !signature || !this.deps.line.verifySignature(rawBody, signature)) {
      res.status(401).json({ error: 'Invalid LINE signature' });
      return;
    }

    const parsed = lineEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.sendStatus(200);
      return;
    }

    for (const event of parsed.data.events ?? []) {
      if (event.type !== 'message' || !event.message || !event.source?.userId) {
        continue;
      }
      await this.dispatch(event.source.userId, event.message);
    }
    res.sendStatus(200);
  }

  private async dispatch(
    senderAddress: string,
    message: { id: string; type: string; text?: string },
  ): Promise<void> {
    const sender = await this.deps.merchants.findByChannelAddress('line', senderAddress);

    if (message.type === 'image' && sender) {
      const media = await this.deps.line.downloadContent(message.id);
      await this.deps.catalogProductPhoto.execute({
        merchantId: sender.id,
        photo: { data: media.data, mimeType: media.mimeType },
        merchantNote: '',
      });
      return;
    }

    if (message.type === 'text' && message.text) {
      await this.deps.relayChatMessage.execute({
        channel: 'line',
        senderAddress,
        text: message.text,
      });
      return;
    }

    if (message.type === 'image') {
      await this.deps.replyFallback(
        senderAddress,
        'Thanks for the photo! To negotiate with a shop, please message it from the listing link.',
      );
    }
  }
}
