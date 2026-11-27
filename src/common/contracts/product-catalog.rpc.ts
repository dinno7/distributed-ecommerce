import type { JsonValue } from '../types/json';
import type { ProductType } from '../types/product-type';
import { EXCHANGES } from './exchanges';

export const PRODUCT_CATALOG_RPC = {
  exchange: EXCHANGES.RPC,
  routingKey: 'rpc.product.catalog.v1',
  queue: 'q.rpc.product.catalog.v1',
} as const;

export const PRODUCT_CATALOG_MAX_IDS = 100;

export interface CatalogProductResponse {
  readonly id: string;
  readonly type: ProductType;
  readonly unitPriceMinor: string;
  readonly availableStock: number | null;
  readonly subscriptionDays: number | null;
  readonly digitalMetadata: JsonValue;
}
