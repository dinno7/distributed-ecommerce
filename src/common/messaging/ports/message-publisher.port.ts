import type { EventMessage } from '../../domain/value-objects/event-message.vo';
import type { JsonObject } from '../../types/json';

export interface MessageRequest {
  readonly exchange: string;
  readonly routingKey: string;
  readonly payload: JsonObject;
  readonly timeoutMs?: number;
}

export class MessageRequestTimeoutError extends Error {}

export abstract class MessagePublisher {
  abstract publish<T>(event: EventMessage<T>): Promise<void>;
  abstract request<T = unknown>(request: MessageRequest): Promise<T>;
}
