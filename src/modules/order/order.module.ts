import { Module } from '@nestjs/common';
import { ProductModule } from '../product/product.module';
import { OrderProductCatalog } from './app/ports/order-product-catalog.port';
import { OrderRepository } from './app/ports/order.repository';
import { CreateOrderUC } from './app/usecases/create-order.uc';
import { OrderProductCatalogAdapter } from './infra/catalog/order-product-catalog.adapter';
import { OrderRepositoryPrisma } from './infra/persistence/order.repository';
import { OrderOutboxRepository } from './app/ports/order-outbox.repository';
import { OrderOutboxRepositoryPrisma } from './infra/persistence/order-outbox.repository';
import { OrderController } from './presentations/http/order.controller';
import { OrderOutboxRelay } from './app/outbox.relay';
import { OutboxRelayRepository } from '../../common/messaging/ports/outbox.repositor';
import { OrderOutboxRelayRepositoryPrisma } from './infra/persistence/order-outbox.relay';

@Module({
  imports: [ProductModule],
  controllers: [OrderController],
  providers: [
    CreateOrderUC,
    OrderOutboxRelay,
    { provide: OrderProductCatalog, useClass: OrderProductCatalogAdapter },
    { provide: OrderRepository, useClass: OrderRepositoryPrisma },
    { provide: OrderOutboxRepository, useClass: OrderOutboxRepositoryPrisma },
    {
      provide: OutboxRelayRepository,
      useClass: OrderOutboxRelayRepositoryPrisma,
    },
  ],
})
export class OrderModule {}
