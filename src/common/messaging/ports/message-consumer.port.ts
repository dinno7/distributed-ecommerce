import { EventMessage } from '../../types/event-message';

export interface IncomingMessage {
  readonly messageId: string | undefined;
  readonly routingKey: string;
  readonly body: unknown;
}

export type MessageDisposition = 'ack' | 'requeue' | 'reject';

export interface SubscriptionOptions {
  /** Routing key / event pattern to listen for (e.g., 'orders.order.created') */
  eventName: string;
  /** Dedicated queue owned by the consuming module (e.g., 'billing.order-created') */
  queue: string;
}

export abstract class MessageConsumer {
  abstract consume<T>(
    options: SubscriptionOptions,
    handler: (event: EventMessage<T>) => Promise<MessageDisposition>,
  ): Promise<void>;
}
