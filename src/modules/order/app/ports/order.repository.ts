import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type { Order } from '../../domain/order.entity';

export abstract class OrderRepository {
  abstract create(order: Order, tx: TransactionCtx): Promise<void>;
  abstract findById(id: string): Promise<Order | null>;
}
