import { Global, Module, type DynamicModule } from '@nestjs/common';
import { MessagePublisher } from './ports/message-publisher.port';
import { RabbitMQTopicPublisher } from './infra/rabbitmq.publisher';
import {
  MessageHandlerErrorBehavior,
  RabbitMQModule,
} from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EXCHANGES } from '../contracts/exchanges';

import { workflowQueueOptions } from './infra/retrier-error-handler';

@Global()
@Module({
  providers: [{ provide: MessagePublisher, useClass: RabbitMQTopicPublisher }],
  exports: [MessagePublisher],
})
export class MessagingModule {
  static forRoot(
    workflowQueues: readonly {
      name: string;
      routingKey: string | string[];
      rejectOnOverflow?: boolean;
    }[],
  ): DynamicModule {
    return {
      module: MessagingModule,
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
            queues: workflowQueues.flatMap(
              ({ name, routingKey, rejectOnOverflow }) => [
                {
                  name,
                  routingKey,
                  exchange: EXCHANGES.MAIN,
                  options: workflowQueueOptions(name, { rejectOnOverflow }),
                },
                {
                  name: `${name}.dlq`,
                  routingKey: `${name}.dlq`,
                  exchange: EXCHANGES.DLX,
                  options: {
                    durable: true,
                    arguments: { 'x-queue-type': 'quorum' },
                  },
                },
              ],
            ),
            prefetchCount: 10,
            enableControllerDiscovery: false,
            defaultSubscribeErrorBehavior: MessageHandlerErrorBehavior.NACK,
            connectionInitOptions: { wait: true, timeout: 10000 },
          }),
        }),
      ],
      exports: [RabbitMQModule],
    };
  }
}
