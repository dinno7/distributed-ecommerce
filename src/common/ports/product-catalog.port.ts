import type { JsonValue } from '../types/json';
import type { ProductType } from '../types/product-type';

export interface CatalogProduct {
  readonly id: string;
  readonly type: ProductType;
  readonly unitPriceMinor: bigint;
  readonly availableStock: number | null;
  readonly subscriptionDays: number | null;
  readonly digitalMetadata: JsonValue;
}

export abstract class ProductCatalog {
  abstract findByIds(
    ids: readonly string[],
  ): Promise<readonly CatalogProduct[]>;
}
