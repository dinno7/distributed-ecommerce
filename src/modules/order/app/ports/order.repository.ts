import type { OrderItemStatus } from '../../domain/order-item.entity';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type { Order } from '../../domain/order.entity';

export abstract class OrderRepository {
  abstract create(order: Order, tx: TransactionCtx): Promise<void>;
  abstract findById(id: string): Promise<Order | null>;
}

export abstract class OrderWorkflowRepository {
  abstract lock(id: string, tx: TransactionCtx): Promise<Order | null>;

  abstract updateState(
    id: string,
    status: Order['status'],
    items: {
      ids: string[];
      status: OrderItemStatus;
      attempts: number;
      lastError: string | null;
    },
    tx: TransactionCtx,
    paymentAttemptNo?: number,
  ): Promise<void>;
}

export interface OrderListFilters {
  customerId?: string;
  status?: Order['status'];
  take: number;
  skip: number;
}

export abstract class OrderListRepository {
  abstract list(filters: OrderListFilters): Promise<Order[]>;
}
