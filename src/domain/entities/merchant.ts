import { ValidationError } from '../errors.js';
import type { Channel } from '../value-objects/channel.js';
import type { CurrencyCode } from '../value-objects/money.js';
import type { LanguageCode } from '../value-objects/language.js';

export interface MerchantProps {
  readonly id: string;
  readonly displayName: string;
  readonly language: LanguageCode;
  readonly currency: CurrencyCode;
  readonly channel: Channel;
  /** Address on the channel, e.g. an E.164 phone number or LINE user id. */
  readonly channelAddress: string;
}

/**
 * A micro-SME merchant (warung, sari-sari store, artisan) registered with
 * the agent. The directory ports resolve channel senders to this entity.
 */
export class Merchant {
  private constructor(public readonly props: MerchantProps) {}

  static create(props: MerchantProps): Merchant {
    if (!props.id.trim()) {
      throw new ValidationError('Merchant id is required');
    }
    if (!props.displayName.trim()) {
      throw new ValidationError('Merchant displayName is required');
    }
    if (!props.channelAddress.trim()) {
      throw new ValidationError('Merchant channelAddress is required');
    }
    return new Merchant(props);
  }

  get id(): string {
    return this.props.id;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get language(): LanguageCode {
    return this.props.language;
  }

  get currency(): CurrencyCode {
    return this.props.currency;
  }

  get channel(): Channel {
    return this.props.channel;
  }

  get channelAddress(): string {
    return this.props.channelAddress;
  }

  toSnapshot(): MerchantProps & Record<string, unknown> {
    return { ...this.props };
  }

  static fromSnapshot(snapshot: MerchantProps): Merchant {
    return Merchant.create(snapshot);
  }
}
