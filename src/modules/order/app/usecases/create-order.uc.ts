import { Injectable, NotFoundException } from '@nestjs/common';
import { PRODUCT_CATALOG_MAX_IDS } from '../../../../common/contracts/product-catalog.rpc';
import type { UseCase } from '../../../../common/ports/usecase.port';
import { ProductType } from '../../../../common/types/product-type';
import { Order } from '../../domain/order.entity';
import { OrderProductCatalog } from '../ports/order-product-catalog.port';
import { OrderCreatedEvent, TransactionManager } from '../../../../common';
import { OrderRepository } from '../ports/order.repository';
import { OrderOutboxRepository } from '../ports/order-outbox.repository';

export interface CreateOrderInput {
  customerId: string;
  items: readonly { productId: string; quantity: number }[];
}

@Injectable()
export class CreateOrderUC implements UseCase<CreateOrderInput, Order> {
  constructor(
    private readonly catalog: OrderProductCatalog,
    private readonly orderRepo: OrderRepository,
    private readonly orderOutboxRepo: OrderOutboxRepository,
    private readonly txManager: TransactionManager,
  ) {}

  async execute({ customerId, items }: CreateOrderInput): Promise<Order> {
    if (items.length === 0) throw new RangeError('An order requires an item');
    if (items.length > PRODUCT_CATALOG_MAX_IDS) {
      throw new RangeError(
        `An order supports up to ${PRODUCT_CATALOG_MAX_IDS} items`,
      );
    }
    const productIds = items.map(({ productId }) => productId.toLowerCase());
    if (new Set(productIds).size !== items.length) {
      throw new Error('An order requires distinct products');
    }

    const products = await this.catalog.findByIds(productIds);
    const productsById = new Map(
      products.map((product) => [product.productId, product]),
    );
    const order = Order.create({ customerId });

    for (const { productId, quantity } of items) {
      const product = productsById.get(productId.toLowerCase());
      if (!product) {
        throw new NotFoundException(`Product ${productId} not found`);
      }
      if (
        product.productType === ProductType.PHYSICAL &&
        quantity > (product.availableStock ?? 0)
      ) {
        throw new Error(`Insufficient stock for product ${productId}`);
      }

      order.addItem({ ...product, quantity });
    }

    await this.txManager.run(async (tx) => {
      await this.orderRepo.create(order, tx);
      await this.orderOutboxRepo.stage(
        new OrderCreatedEvent({
          orderId: order.id,
          customerId,
          currency: order.currency,
          itemCount: order.itemsCount,
          totalMinor: order.totalMinor.toString(),
        }),
        tx,
      );
    });
    return order;
  }
}
