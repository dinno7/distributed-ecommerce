import { Module } from '@nestjs/common';

import { FulfillmentPersistenceModule } from '../fulfillment-persistence.module';
import { ActivateSubscriptionUC } from './app/usecases/subscription.use-case';
import { Subscriptions } from './app/ports/subscription.port';
import { PrismaSubscriptions } from './infra/persistence/subscription.prisma';
import { SubscriptionConsumer } from './presentation/rabbitmq/subscription.consumer';

@Module({
  imports: [FulfillmentPersistenceModule],
  providers: [
    SubscriptionConsumer,
    ActivateSubscriptionUC,
    { provide: Subscriptions, useClass: PrismaSubscriptions },
  ],
})
export class SubscriptionModule {}
