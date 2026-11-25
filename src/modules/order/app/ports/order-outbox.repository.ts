import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type { EventMessage } from '../../../../common/types/event-message';

export abstract class OrderOutboxRepository {
  abstract stage(
    event: EventMessage<{ orderId: string }>,
    tx: TransactionCtx,
  ): Promise<void>;
}
