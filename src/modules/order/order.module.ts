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

@Module({
  imports: [ProductModule],
  controllers: [OrderController],
  providers: [
    CreateOrderUC,
    { provide: OrderProductCatalog, useClass: OrderProductCatalogAdapter },
    { provide: OrderRepository, useClass: OrderRepositoryPrisma },
    { provide: OrderOutboxRepository, useClass: OrderOutboxRepositoryPrisma },
  ],
})
export class OrderModule {}
