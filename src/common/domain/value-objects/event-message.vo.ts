import * as crypto from 'crypto';
import { EXCHANGES } from '../../contracts/exchanges';

interface EventMessageOpts {
  exchangeName?: string;
  persistence?: boolean;
  occurredAt?: Date;
  eventId?: string;
  maxRetryCount?: number;
}

export class EventMessage<P> {
  readonly exchangeName: string;
  readonly persistence: boolean;
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor(
    public readonly payload: P,
    public readonly routingKey: string,
    options: EventMessageOpts = {},
  ) {
    this.eventId = options?.eventId ?? crypto.randomUUIDv7().toString();
    this.exchangeName = options?.exchangeName ?? EXCHANGES.MAIN;
    this.persistence = options?.persistence ?? true;
    this.occurredAt = options?.occurredAt ?? new Date();
  }
}
