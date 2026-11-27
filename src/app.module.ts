import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import appConfig, { validate } from './env.validate';
import { ProductModule } from './modules/product/product.module';
import { PersistenceModule } from './common';
import { OrderModule } from './modules/order/order.module';
import { IdempotencyModule } from '@nestjs/idempotency';
import { PrismaIdempotencyStore } from './common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MessagingModule } from './common/messaging/messaging.module';
import { QUEUES } from './common/contracts/queues';
import { ROUTING_KEYS } from './common/contracts/routing-keys';
import {
  orderFulfillmentQueue,
  orderPaymentQueue,
} from './modules/order/presentations/rabbitmq/order-workflow.routes';

import { PaymentModule } from './modules/payment/payment.module';
import { AuditModule } from './modules/audit/audit.module';
const workflowQueues = [
  // Preserve the existing payment queue declaration on upgrade.
  {
    name: QUEUES.PaymentProcess,
    routingKey: ROUTING_KEYS.OrderCreated,
    rejectOnOverflow: false,
  },
  orderPaymentQueue,
  { name: QUEUES.FulfillDigital, routingKey: ROUTING_KEYS.GrantDigital },
  {
    name: QUEUES.FulfillSubscription,
    routingKey: ROUTING_KEYS.ActivateSubscription,
  },
  { name: QUEUES.FulfillPhysical, routingKey: ROUTING_KEYS.FulfillPhysical },
  orderFulfillmentQueue,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    IdempotencyModule.forRoot({
      scope: false,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      serveStaticOptions: {
        fallthrough: false,
      },
    }),
    MessagingModule.forRoot(workflowQueues),
    PersistenceModule,
    ProductModule,
    OrderModule,
    PaymentModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [PrismaIdempotencyStore],
})
export class AppModule {}
