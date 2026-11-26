import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { MessagePublisher } from '../ports/message-publisher.port';
import { EventMessage } from '../../';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RabbitMQTopicPublisher implements MessagePublisher {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publish<T>({
    exchangeName,
    routingKey,
    payload,
    persistence,
    eventId,
    occurredAt,
  }: EventMessage<T>): Promise<void> {
    await this.amqpConnection.publish(exchangeName, routingKey, payload, {
      persistent: persistence,
      messageId: eventId,
      timestamp: Math.floor(occurredAt.getTime() / 1000),
    });
  }
}
