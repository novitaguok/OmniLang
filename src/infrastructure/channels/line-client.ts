import { createHmac, timingSafeEqual } from 'node:crypto';

import { InfrastructureError } from '../errors.js';
import type { DownloadedMedia } from './whatsapp-client.js';

/**
 * LINE Messaging API client. Pushes text messages, verifies webhook
 * signatures (HMAC-SHA256 over the raw body) and downloads message content.
 */
export class LineClient {
  constructor(
    private readonly channelAccessToken: string,
    private readonly channelSecret: string,
  ) {}

  async sendText(to: string, text: string): Promise<void> {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new InfrastructureError(`LINE push message failed (${response.status}): ${body}`);
    }
  }

  async downloadContent(messageId: string): Promise<DownloadedMedia> {
    const response = await fetch(`https://api.line.me/v2/bot/message/${messageId}/content`, {
      headers: { Authorization: `Bearer ${this.channelAccessToken}` },
    });
    if (!response.ok) {
      throw new InfrastructureError(`LINE content download failed (${response.status})`);
    }
    const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
    const data = Buffer.from(await response.arrayBuffer());
    return { data, mimeType };
  }

  /** Constant-time HMAC-SHA256 validation of the x-line-signature header. */
  verifySignature(rawBody: Buffer, signature: string): boolean {
    const expected = createHmac('sha256', this.channelSecret).update(rawBody).digest('base64');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const providedBuffer = Buffer.from(signature, 'utf8');
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedBuffer, providedBuffer);
  }
}
