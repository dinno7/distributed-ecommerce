import * as crypto from 'crypto';
import { JsonObject, JsonValue } from './json';
import { EXCHANGE_MAIN } from '../contracts/exchanges';

export class EventMessage<P> {
  headers?: JsonObject;
  constructor(
    public payload: P,
    public routingKey: string,
    public exchangeName: string = EXCHANGE_MAIN,
    public persistence: boolean = true,
    public occurredAt: Date = new Date(),
    public eventId: string = crypto.randomUUIDv7().toString(),
  ) {}
}
