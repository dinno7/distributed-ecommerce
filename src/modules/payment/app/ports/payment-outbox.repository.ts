import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type {
  PaymentFailedEvent,
  PaymentStartedEvent,
  PaymentSucceededEvent,
} from '../../../../common/contracts/messages';

export abstract class PaymentOutboxRepository {
  abstract stage(
    event: PaymentStartedEvent | PaymentSucceededEvent | PaymentFailedEvent,
    tx: TransactionCtx,
  ): Promise<void>;
}
