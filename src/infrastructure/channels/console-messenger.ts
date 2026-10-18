import { randomUUID } from 'node:crypto';
import type { ChannelMessenger, OutboundMessage } from '../../application/ports/channel-messenger.js';

export interface RecordedOutboundMessage extends OutboundMessage {
  readonly id: string;
  readonly sentAt: string;
}

/**
 * Credential-free messenger used in demo mode and local development:
 * every outbound message is logged and retained in memory so both the
 * console and the interactive demo studio can observe the full flow.
 */
export class ConsoleMessenger implements ChannelMessenger {
  private readonly history: RecordedOutboundMessage[] = [];

  async send(message: OutboundMessage): Promise<void> {
    this.history.push({
      ...message,
      id: randomUUID(),
      sentAt: new Date().toISOString(),
    });
    process.stdout.write(`[${message.channel}] -> ${message.to}: ${message.text}\n`);
  }

  listSent(): readonly RecordedOutboundMessage[] {
    return [...this.history];
  }

  clear(): void {
    this.history.length = 0;
  }
}
