import { EventMessage } from '../../';

export abstract class MessagePublisher {
  abstract publish<T>(event: EventMessage<T>): Promise<void>;
}
