import { Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../common/ports/usecase.port';
import type { Order } from '../../domain/order.entity';
import {
  OrderListRepository,
  type OrderListFilters,
} from '../ports/order.repository';

@Injectable()
export class ListOrdersUC implements UseCase<OrderListFilters, Order[]> {
  constructor(private readonly orders: OrderListRepository) {}

  execute(filters: OrderListFilters): Promise<Order[]> {
    return this.orders.list(filters);
  }
}
