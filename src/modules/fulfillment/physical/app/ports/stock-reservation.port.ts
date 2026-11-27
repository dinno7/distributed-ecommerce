import type { TransactionCtx } from '../../../../../common/ports/transaction.port';
import type { StockReservation } from '../../domain/physical-outcome';

export abstract class PhysicalStockReservation {
  abstract reserve(
    productId: string,
    quantity: number,
    tx: TransactionCtx,
  ): Promise<StockReservation>;
}
