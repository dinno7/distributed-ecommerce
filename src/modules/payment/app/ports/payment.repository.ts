import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type { Payment } from '../../domain/payment.entity';

export abstract class PaymentRepository {
  // Returns false when the order and attempt already exist.
  abstract create(payment: Payment, tx: TransactionCtx): Promise<boolean>;

  abstract findById(id: string): Promise<Payment | null>;

  abstract findLatestByOrderId(orderId: string): Promise<Payment | null>;

  abstract findByIdForUpdate(
    id: string,
    tx: TransactionCtx,
  ): Promise<Payment | null>;

  abstract findByOrderIdAndAttempt(
    orderId: string,
    attempt: number,
    tx: TransactionCtx,
  ): Promise<Payment | null>;

  abstract update(payment: Payment, tx: TransactionCtx): Promise<void>;
}
