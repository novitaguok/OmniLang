import type { Channel } from '../../domain/value-objects/channel.js';

export interface OutboundMessage {
  readonly channel: Channel;
  readonly to: string;
  readonly text: string;
}

/** Port: delivers agent replies to merchants and buyers on their channel. */
export interface ChannelMessenger {
  send(message: OutboundMessage): Promise<void>;
}
