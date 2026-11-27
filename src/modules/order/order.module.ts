import { Module } from '@nestjs/common';
import { OrderProductCatalog } from './app/ports/order-product-catalog.port';
import {
  OrderPaymentReader,
  OrderShipmentReader,
} from './app/ports/order-related-data.port';
import {
  OrderListRepository,
  OrderRepository,
  OrderWorkflowRepository,
} from './app/ports/order.repository';
import { CreateOrderUC } from './app/usecases/create-order.uc';
import { GetOrderUC } from './app/usecases/get-order.uc';
import { OrderProductCatalogAdapter } from './infra/catalog/order-product-catalog.adapter';
import { OrderRepositoryPrisma } from './infra/persistence/order.repository';
import { OrderOutboxRepository } from './app/ports/order-outbox.repository';
import { OrderOutboxRepositoryPrisma } from './infra/persistence/order-outbox.repository';
import { OrderOutboxRelay } from './app/outbox.relay';
import { OutboxRelayRepository } from '../../common/messaging/ports/outbox.repositor';
import { OrderOutboxRelayRepositoryPrisma } from './infra/persistence/order-outbox.relay';
import {
  OrderPaymentAdapter,
  OrderShipmentAdapter,
} from './infra/queries/order-related-data.adapters';

import { ApplyFulfillmentOutcomeUC } from './app/usecases/apply-fulfillment-outcome.uc';
import { ApplyPaymentResultUC } from './app/usecases/apply-payment-result.uc';
import { ListOrdersUC } from './app/usecases/list-orders.uc';
import { RetryOrderFulfillmentUC } from './app/usecases/retry-order-fulfillment.uc';
import { OrderController } from './presentations/http/order.controller';
import { OrderWorkflowConsumer } from './presentations/rabbitmq/order-workflow.consumer';

@Module({
  controllers: [OrderController],
  providers: [
    CreateOrderUC,
    GetOrderUC,
    ApplyPaymentResultUC,
    ApplyFulfillmentOutcomeUC,
    RetryOrderFulfillmentUC,
    ListOrdersUC,
    OrderWorkflowConsumer,
    OrderRepositoryPrisma,
    { provide: OrderListRepository, useExisting: OrderRepositoryPrisma },
    { provide: OrderWorkflowRepository, useExisting: OrderRepositoryPrisma },
    OrderOutboxRelay,
    { provide: OrderPaymentReader, useClass: OrderPaymentAdapter },
    { provide: OrderShipmentReader, useClass: OrderShipmentAdapter },
    { provide: OrderProductCatalog, useClass: OrderProductCatalogAdapter },
    { provide: OrderRepository, useExisting: OrderRepositoryPrisma },
    { provide: OrderOutboxRepository, useClass: OrderOutboxRepositoryPrisma },
    {
      provide: OutboxRelayRepository,
      useClass: OrderOutboxRelayRepositoryPrisma,
    },
  ],
})
export class OrderModule {}
