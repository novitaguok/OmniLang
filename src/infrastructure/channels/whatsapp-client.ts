import { InfrastructureError } from '../errors.js';

export interface DownloadedMedia {
  readonly data: Buffer;
  readonly mimeType: string;
}

/**
 * WhatsApp Business Cloud API client (Graph API). Sends text messages and
 * downloads inbound photo media for vision analysis.
 */
export class WhatsAppClient {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
    private readonly apiVersion: string,
  ) {}

  private graphUrl(path: string): string {
    return `https://graph.facebook.com/${this.apiVersion}/${path}`;
  }

  private async graph(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(this.graphUrl(path), {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new InfrastructureError(`WhatsApp Graph API ${path} failed (${response.status}): ${body}`);
    }
    return response;
  }

  async sendText(to: string, text: string): Promise<void> {
    await this.graph(`${this.phoneNumberId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text, preview_url: true },
      }),
    });
  }

  /** Two-step media download: resolve the media URL, then fetch the bytes. */
  async downloadMedia(mediaId: string): Promise<DownloadedMedia> {
    const metadata = await this.graph(mediaId);
    const { url } = (await metadata.json()) as { url?: string };
    if (!url) {
      throw new InfrastructureError(`WhatsApp media '${mediaId}' has no download URL`);
    }

    const response = await fetch(url, { headers: { Authorization: `Bearer ${this.accessToken}` } });
    if (!response.ok) {
      throw new InfrastructureError(`WhatsApp media download failed (${response.status})`);
    }
    const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
    const data = Buffer.from(await response.arrayBuffer());
    return { data, mimeType };
  }
}
