import { Injectable, NotFoundException } from '@nestjs/common';
import type { LatestPayment } from '../../../../common/ports/latest-payment-query.port';
import type { ShipmentSummary } from '../../../../common/ports/shipment-query.port';
import type { UseCase } from '../../../../common/ports/usecase.port';
import type { Order } from '../../domain/order.entity';
import {
  OrderPaymentReader,
  OrderShipmentReader,
} from '../ports/order-related-data.port';
import { OrderRepository } from '../ports/order.repository';

interface OrderDetail {
  order: Order;
  payment: LatestPayment | null;
  shipments: ShipmentSummary[];
}

@Injectable()
export class GetOrderUC implements UseCase<string, OrderDetail> {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: OrderPaymentReader,
    private readonly shipments: OrderShipmentReader,
  ) {}

  async execute(id: string): Promise<OrderDetail> {
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException('Order not found');

    const [payment, shipments] = await Promise.all([
      this.payments.findLatest(order.id),
      this.shipments.findByItemIds(order.items.map((item) => item.id)),
    ]);
    return { order, payment, shipments };
  }
}
