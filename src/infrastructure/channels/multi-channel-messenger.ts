import type { ChannelMessenger, OutboundMessage } from '../../application/ports/channel-messenger.js';
import type { WhatsAppClient } from './whatsapp-client.js';
import type { LineClient } from './line-client.js';
import { InfrastructureError } from '../errors.js';

/**
 * Routes outbound agent messages to the concrete channel API client.
 */
export class MultiChannelMessenger implements ChannelMessenger {
  constructor(
    private readonly whatsapp: WhatsAppClient | null,
    private readonly line: LineClient | null,
  ) {}

  async send(message: OutboundMessage): Promise<void> {
    if (message.channel === 'whatsapp') {
      if (!this.whatsapp) {
        throw new InfrastructureError('WhatsApp credentials are not configured');
      }
      await this.whatsapp.sendText(message.to, message.text);
      return;
    }
    if (!this.line) {
      throw new InfrastructureError('LINE credentials are not configured');
    }
    await this.line.sendText(message.to, message.text);
  }
}
