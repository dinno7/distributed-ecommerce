import { Injectable } from '@nestjs/common';
import { ProductStockReservation } from '../../../../../common/ports/product-stock-reservation.port';
import type { TransactionCtx } from '../../../../../common/ports/transaction.port';
import type { PhysicalStockReservation } from '../../app/ports/stock-reservation.port';

@Injectable()
export class PhysicalStockReservationAdapter implements PhysicalStockReservation {
  constructor(private readonly inventory: ProductStockReservation) {}

  reserve(productId: string, quantity: number, tx: TransactionCtx) {
    return this.inventory.reserveStock(productId, quantity, tx);
  }
}
