import { Money } from '../../common/value-objects/money';
import type { Product as ProductRow } from '../../generated/prisma/client';
import type { Product } from './entities/product.entity';
import { Product as ProductEntity } from './entities/product.entity';

export class ProductMapper {
  static toDomain(row: ProductRow, availableStock?: number): Product {
    return new ProductEntity(
      row.id,
      row.name,
      row.type,
      new Money(row.unitPriceMinor),
      row.subscriptionDays,
      row.digitalMetadata,
      availableStock,
    );
  }

  static toResponse(product: Product) {
    return {
      id: product.id,
      name: product.name,
      type: product.type,
      unitPriceMinor: product.unitPrice.minorUnits.toString(),
      currency: product.unitPrice.currency,
      subscriptionDays: product.subscriptionDays ?? undefined,
      digitalMetadata: product.digitalMetadata ?? undefined,
      availableStock: product.availableStock,
    };
  }
}
