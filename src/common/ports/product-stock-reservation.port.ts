import type { TransactionCtx } from './transaction.port';

export type StockReservationResult =
  'RESERVED' | 'OUT_OF_STOCK' | 'INVENTORY_UNAVAILABLE';

export abstract class ProductStockReservation {
  abstract reserveStock(
    productId: string,
    quantity: number,
    tx: TransactionCtx,
  ): Promise<StockReservationResult>;
}
