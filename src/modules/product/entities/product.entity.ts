import type { JsonValue } from '../../../common';
import type { Money } from '../../../common/value-objects/money';

export const ProductType = {
  PHYSICAL: 'PHYSICAL',
  DIGITAL: 'DIGITAL',
  SUBSCRIPTION: 'SUBSCRIPTION',
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];

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
