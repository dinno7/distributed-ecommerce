import type { TransactionCtx } from '../../../../../common/ports/transaction.port';

export abstract class Subscriptions {
  abstract extend(
    customerId: string,
    productId: string,
    days: bigint,
    tx: TransactionCtx,
  ): Promise<boolean>;
}
