import type { ChannelMessenger, OutboundMessage } from '../../application/ports/channel-messenger.js';

/**
 * Credential-free messenger used in demo mode and local development:
 * every outbound message is logged, making the full conversational flow
 * observable without any messaging platform.
 */
export class ConsoleMessenger implements ChannelMessenger {
  async send(message: OutboundMessage): Promise<void> {
    process.stdout.write(`[${message.channel}] -> ${message.to}: ${message.text}\n`);
  }
}
