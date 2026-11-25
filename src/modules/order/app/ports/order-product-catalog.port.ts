import { TransactionCtx } from '../../../../common';
import type { JsonValue } from '../../../../common/types/json';
import type { OrderItemSnapshot } from '../../domain/order-item.entity';

export interface OrderCatalogProduct extends Omit<
  OrderItemSnapshot,
  'quantity'
> {
  readonly availableStock: number | null;
  readonly subscriptionDays: number | null;
  readonly digitalMetadata: JsonValue;
}

export abstract class OrderProductCatalog {
  abstract findByIds(
    ids: readonly string[],
    tx: TransactionCtx,
  ): Promise<readonly OrderCatalogProduct[]>;
}
