import { InvalidTransitionError, ValidationError } from '../errors.js';
import type { Channel } from '../value-objects/channel.js';
import type { LanguageCode } from '../value-objects/language.js';

/**
 * Negotiation lifecycle, mirroring the Dialogflow CX state machine from
 * the system design: Inquiry -> Offer -> Shipping -> Invoiced -> Paid.
 * The OFFER -> OFFER loop models counter-offers ("bisa nego tipis").
 */
export type NegotiationStage = 'INQUIRY' | 'OFFER' | 'SHIPPING' | 'INVOICED' | 'PAID';

const ALLOWED_TRANSITIONS: Record<NegotiationStage, readonly NegotiationStage[]> = {
  INQUIRY: ['OFFER'],
  OFFER: ['OFFER', 'SHIPPING'],
  SHIPPING: ['INVOICED'],
  INVOICED: ['PAID'],
  PAID: [],
};

export const ACTIVE_STAGES: readonly NegotiationStage[] = ['INQUIRY', 'OFFER', 'SHIPPING'];

export type TurnRole = 'merchant' | 'buyer';

export interface NegotiationTurn {
  readonly role: TurnRole;
  /** Original text as sent by the participant. */
  readonly text: string;
  /** Dialect-preserving translation delivered to the other side. */
  readonly translated: string;
  readonly sentAt: Date;
}

export interface NegotiationProps {
  readonly id: string;
  readonly channel: Channel;
  readonly merchantId: string;
  readonly merchantAddress: string;
  readonly merchantLanguage: LanguageCode;
  readonly buyerAddress: string;
  readonly buyerLanguage: LanguageCode;
  readonly listingId: string | null;
  stage: NegotiationStage;
  readonly createdAt: Date;
  updatedAt: Date;
}

const MAX_TURNS = 200;

/**
 * A stateful buyer-merchant negotiation. Every relayed turn is recorded so
 * deal history, discount agreements and order intent survive across turns.
 */
export class Negotiation {
  private readonly props: NegotiationProps;
  private readonly turns: NegotiationTurn[];

  private constructor(props: NegotiationProps, turns: NegotiationTurn[]) {
    this.props = props;
    this.turns = turns;
  }

  static open(input: Omit<NegotiationProps, 'stage' | 'createdAt' | 'updatedAt'>): Negotiation {
    if (!input.id.trim()) {
      throw new ValidationError('Negotiation id is required');
    }
    if (!input.merchantId.trim()) {
      throw new ValidationError('Negotiation merchantId is required');
    }
    if (!input.merchantAddress.trim() || !input.buyerAddress.trim()) {
      throw new ValidationError('Negotiation requires both participant addresses');
    }
    const now = new Date();
    return new Negotiation({ ...input, stage: 'INQUIRY', createdAt: now, updatedAt: now }, []);
  }

  /** Record a relayed turn; maintains the deal-history context. */
  recordTurn(role: TurnRole, text: string, translated: string): void {
    if (!text.trim()) {
      throw new ValidationError('Turn text is required');
    }
    if (this.turns.length >= MAX_TURNS) {
      throw new ValidationError(`Negotiation supports at most ${MAX_TURNS} turns`);
    }
    this.turns.push({ role, text, translated, sentAt: new Date() });
    this.props.updatedAt = this.turns[this.turns.length - 1]!.sentAt;
  }

  /** Move one step along the state machine. */
  advanceTo(stage: NegotiationStage): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.stage];
    if (!allowed.includes(stage)) {
      throw new InvalidTransitionError(this.props.stage, stage);
    }
    this.props.stage = stage;
    this.props.updatedAt = new Date();
  }

  /** Close the negotiation: walk INQUIRY -> OFFER -> SHIPPING -> INVOICED. */
  markInvoiced(): void {
    while (this.props.stage !== 'INVOICED') {
      const next: Record<NegotiationStage, NegotiationStage> = {
        INQUIRY: 'OFFER',
        OFFER: 'SHIPPING',
        SHIPPING: 'INVOICED',
        INVOICED: 'PAID',
        PAID: 'PAID',
      };
      if (this.props.stage === 'PAID') {
        throw new InvalidTransitionError('PAID', 'INVOICED');
      }
      this.advanceTo(next[this.props.stage]);
    }
  }

  get id(): string {
    return this.props.id;
  }

  get channel(): Channel {
    return this.props.channel;
  }

  get merchantId(): string {
    return this.props.merchantId;
  }

  get merchantAddress(): string {
    return this.props.merchantAddress;
  }

  get merchantLanguage(): LanguageCode {
    return this.props.merchantLanguage;
  }

  get buyerAddress(): string {
    return this.props.buyerAddress;
  }

  get buyerLanguage(): LanguageCode {
    return this.props.buyerLanguage;
  }

  get listingId(): string | null {
    return this.props.listingId;
  }

  get stage(): NegotiationStage {
    return this.props.stage;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get transcript(): readonly NegotiationTurn[] {
    return [...this.turns];
  }

  toSnapshot(): Record<string, unknown> {
    return {
      id: this.props.id,
      channel: this.props.channel,
      merchantId: this.props.merchantId,
      merchantAddress: this.props.merchantAddress,
      merchantLanguage: this.props.merchantLanguage,
      buyerAddress: this.props.buyerAddress,
      buyerLanguage: this.props.buyerLanguage,
      listingId: this.props.listingId,
      stage: this.props.stage,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      turns: this.turns.map((turn) => ({
        role: turn.role,
        text: turn.text,
        translated: turn.translated,
        sentAt: turn.sentAt.toISOString(),
      })),
    };
  }

  static fromSnapshot(snapshot: Record<string, unknown>): Negotiation {
    const s = snapshot as {
      id: string;
      channel: Channel;
      merchantId: string;
      merchantAddress: string;
      merchantLanguage: LanguageCode;
      buyerAddress: string;
      buyerLanguage: LanguageCode;
      listingId: string | null;
      stage: NegotiationStage;
      createdAt: string;
      updatedAt: string;
      turns: { role: TurnRole; text: string; translated: string; sentAt: string }[];
    };
    const turns = s.turns.map((turn) => ({
      role: turn.role,
      text: turn.text,
      translated: turn.translated,
      sentAt: new Date(turn.sentAt),
    }));
    return new Negotiation(
      {
        id: s.id,
        channel: s.channel,
        merchantId: s.merchantId,
        merchantAddress: s.merchantAddress,
        merchantLanguage: s.merchantLanguage,
        buyerAddress: s.buyerAddress,
        buyerLanguage: s.buyerLanguage,
        listingId: s.listingId,
        stage: s.stage,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
      turns,
    );
  }
}
