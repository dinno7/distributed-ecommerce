import { Injectable, Logger, Module } from '@nestjs/common';
import { BaseOutboxRelay } from '../../common/messaging/infra/base-outbox.relay';
import { MessagePublisher } from '../../common/messaging/ports/message-publisher.port';
import {
  FulfillmentAttemptRunner,
  FulfillmentStore,
} from './app/fulfillment-attempt';
import { PrismaFulfillmentStore } from './infra/fulfillment-store.prisma';

@Injectable()
class FulfillmentOutboxRelay extends BaseOutboxRelay {
  protected readonly logger = new Logger(FulfillmentOutboxRelay.name);

  constructor(store: PrismaFulfillmentStore, publisher: MessagePublisher) {
    super(store, publisher);
  }
}

@Module({
  providers: [
    PrismaFulfillmentStore,
    { provide: FulfillmentStore, useExisting: PrismaFulfillmentStore },
    FulfillmentAttemptRunner,
    FulfillmentOutboxRelay,
  ],
  exports: [FulfillmentAttemptRunner],
})
export class FulfillmentPersistenceModule {}
