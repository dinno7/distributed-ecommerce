import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { ConfirmChannel, Message } from 'amqplib';
import { randomUUID } from 'node:crypto';
import type { EventMessage } from '../../domain/value-objects/event-message.vo';
import type { MessagePublisher } from '../ports/message-publisher.port';

@Injectable()
export class RabbitMQTopicPublisher implements MessagePublisher, OnModuleInit {
  private readonly pending = new Map<string, { returned: boolean }>();

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async onModuleInit(): Promise<void> {
    await this.amqpConnection.managedChannel.addSetup(
      (channel: ConfirmChannel) => {
        channel.on('return', (message: Message) => {
          const token: unknown =
            message.properties.headers?.['x-publish-token'];
          if (typeof token !== 'string') return;
          const publication = this.pending.get(token);
          if (publication) publication.returned = true;
        });
        return Promise.resolve();
      },
    );
  }

  async publish<T>({
    exchangeName,
    routingKey,
    payload,
    persistence,
    eventId,
    occurredAt,
  }: EventMessage<T>): Promise<void> {
    const token = randomUUID();
    const publication = { returned: false };
    this.pending.set(token, publication);
    try {
      await this.amqpConnection.managedChannel.publish(
        exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        {
          persistent: persistence,
          mandatory: true,
          messageId: eventId,
          contentType: 'application/json',
          timestamp: Math.floor(occurredAt.getTime() / 1000),
          headers: {
            'x-publish-token': token,
            'x-occurred-at': occurredAt.toISOString(),
          },
          timeout: 5_000,
        },
      );
      if (publication.returned)
        throw new Error(`Unroutable publication: ${routingKey}`);
    } finally {
      this.pending.delete(token);
    }
  }
}
