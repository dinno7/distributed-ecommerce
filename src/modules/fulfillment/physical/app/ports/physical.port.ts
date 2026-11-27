import type { TransactionCtx } from '../../../../../common/ports/transaction.port';

export abstract class PhysicalFulfillment {
  abstract ship(
    orderItemId: string,
    quantity: number,
    tx: TransactionCtx,
  ): Promise<string>;
}
