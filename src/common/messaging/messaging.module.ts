import { Global, Module } from '@nestjs/common';
import { MessagePublisher } from './ports/message-publisher.port';
import { RabbitMQTopicPublisher } from './infra/rabbitmq.publisher';
import {
  MessageHandlerErrorBehavior,
  RabbitMQModule,
} from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EXCHANGES } from '../contracts/exchanges';

@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('app.rabbitmqUrl'),
        exchangeBindings: [
          {
            source: EXCHANGES.MAIN,
            destination: EXCHANGES.AUDIT,
            pattern: '#',
          },
          {
            source: EXCHANGES.RETRY,
            destination: EXCHANGES.AUDIT,
            pattern: '#',
          },
          {
            source: EXCHANGES.DLX,
            destination: EXCHANGES.AUDIT,
            pattern: '#',
          },
        ],
        exchanges: [
          {
            name: EXCHANGES.AUDIT,
            type: 'fanout',
            createExchangeIfNotExists: true,
            options: {
              durable: true,
            },
          },
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
