import type { Prisma } from '../../../../generated/prisma/client.js';
import { Order } from '../../domain/order.entity';

export class OrderMapper {
  static toDomain(
    row: Prisma.OrderGetPayload<{ include: { items: true } }>,
  ): Order {
    return new Order(
      row.id,
      row.userId,
      row.status,
      row.totalMinor,
      row.currency,
      row.createdAt,
      row.updatedAt,
      row.items.map(({ orderId: _orderId, ...item }) => item),
    );
  }

  static toPersistence(order: Order): Prisma.OrderCreateInput {
    return {
      id: order.id,
      userId: order.customerId,
      status: order.status,
      totalMinor: order.totalMinor,
      currency: order.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: { create: [...order.items] },
    };
  }
}
