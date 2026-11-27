import { Module } from '@nestjs/common';
import { ShipmentQuery } from '../../../common/ports/shipment-query.port';
import { PhysicalStockReservation } from './app/ports/stock-reservation.port';
import { PhysicalStockReservationAdapter } from './infra/inventory/physical-stock-reservation.adapter';
import { FulfillmentPersistenceModule } from '../fulfillment-persistence.module';
import { FulfillPhysicalUC } from './app/usecases/physical.use-case';
import { PhysicalFulfillment } from './app/ports/physical.port';
import { PrismaPhysicalFulfillment } from './infra/persistence/physical.prisma';
import { PhysicalConsumer } from './presentation/rabbitmq/physical.consumer';

@Module({
  imports: [FulfillmentPersistenceModule],
  providers: [
    PhysicalConsumer,
    FulfillPhysicalUC,
    PrismaPhysicalFulfillment,
    { provide: PhysicalFulfillment, useExisting: PrismaPhysicalFulfillment },
    { provide: ShipmentQuery, useExisting: PrismaPhysicalFulfillment },
    {
      provide: PhysicalStockReservation,
      useClass: PhysicalStockReservationAdapter,
    },
  ],
  exports: [ShipmentQuery],
})
export class PhysicalModule {}
