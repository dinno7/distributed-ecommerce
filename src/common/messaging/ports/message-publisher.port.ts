import { EventMessage } from '../../types/event-message';

export abstract class MessagePublisher {
  abstract publish<T>(event: EventMessage<T>): Promise<void>;
}
