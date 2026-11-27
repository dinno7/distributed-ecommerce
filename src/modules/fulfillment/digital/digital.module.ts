import { Module } from '@nestjs/common';

import { FulfillmentPersistenceModule } from '../fulfillment-persistence.module';
import { GrantDigitalUC } from './app/usecases/digital.use-case';
import { DigitalGrants } from './app/ports/digital.port';
import { PrismaDigitalGrants } from './infra/persistence/digital.prisma';
import { DigitalConsumer } from './presentation/rabbitmq/digital.consumer';

@Module({
  imports: [FulfillmentPersistenceModule],
  providers: [
    DigitalConsumer,
    GrantDigitalUC,
    { provide: DigitalGrants, useClass: PrismaDigitalGrants },
  ],
})
export class DigitalModule {}
