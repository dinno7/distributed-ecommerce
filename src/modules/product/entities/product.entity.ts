import type { JsonValue, ProductType } from '../../../common/types';
import type { Money } from '../../../common/value-objects/money';

export { ProductType } from '../../../common/types/product-type';

export class Product {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly type: ProductType,
    readonly unitPrice: Money,
    readonly subscriptionDays: number | null,
    readonly digitalMetadata: JsonValue,
    readonly availableStock?: number,
  ) {}
}
