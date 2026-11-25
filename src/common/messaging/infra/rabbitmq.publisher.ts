import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { MessagePublisher } from '../ports/message-publisher.port';
import { EventMessage } from '../../types/event-message';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RabbitMQTopicPublisher implements MessagePublisher {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publish<T>(event: EventMessage<T>): Promise<void> {
    await this.amqpConnection.publish(
      event.exchangeName,
      event.routingKey,
      event.payload,
      {
        persistent: event.persistence,
        headers: event.headers,
        messageId: event.eventId,
        timestamp: Math.floor(event.occurredAt.getTime() / 1000),
      },
    );
  }
}
