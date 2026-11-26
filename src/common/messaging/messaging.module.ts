import { Global, Module } from '@nestjs/common';
import { MessagePublisher } from './ports/message-publisher.port';
import { RabbitMQTopicPublisher } from './infra/rabbitmq.publisher';
import {
  MessageHandlerErrorBehavior,
  RabbitMQModule,
  RabbitMQQueueConfig,
} from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EXCHANGES } from '../contracts/exchanges';
import { DealLetterQueues, RetryQueues } from '../contracts/queues';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('app.rabbitmqUrl'),
        exchanges: [
          {
            name: EXCHANGES.MAIN,
            type: 'topic',
            createExchangeIfNotExists: true,
            options: {
              durable: true,
            },
          },
          {
            name: EXCHANGES.RETRY,
            type: 'direct',
            createExchangeIfNotExists: true,
            options: {
              durable: true,
            },
          },
          {
            name: EXCHANGES.DLX,
            type: 'direct',
            createExchangeIfNotExists: true,
            options: {
              durable: true,
            },
          },
        ],
        queues: [
          ...RetryQueues.flatMap(
            ({ queueName, ttlSeconds }): RabbitMQQueueConfig[] =>
              ttlSeconds.map((ttl, index) => ({
                name: `${queueName}.retry.${ttl}s`,
                exchange: EXCHANGES.RETRY,
                routingKey: `${queueName}.retry.${index + 1}`,
                createQueueIfNotExists: true,
                options: {
                  durable: true,
                  messageTtl: ttl * 1_000,
                  deadLetterExchange: '',
                  deadLetterRoutingKey: queueName,
                },
              })),
          ),
          // Final Dead Letter Queue for exhausted or non-retryable messages
          ...DealLetterQueues.map((q): RabbitMQQueueConfig => ({
            name: `${q}.dlq`,
            exchange: EXCHANGES.DLX,
            routingKey: `${q}.dlq`,
            createQueueIfNotExists: true,
            options: { durable: true },
          })),
        ],
        prefetchCount: 10,
        enableControllerDiscovery: false,
        defaultSubscribeErrorBehavior: MessageHandlerErrorBehavior.NACK,
        connectionInitOptions: { wait: true, timeout: 10000 },
      }),
    }),
  ],
  providers: [
    {
      provide: MessagePublisher,
      useClass: RabbitMQTopicPublisher,
    },
  ],
  exports: [
    RabbitMQModule,
    {
      provide: MessagePublisher,
      useExisting: RabbitMQTopicPublisher,
    },
  ],
})
export class MessagingModule {}
