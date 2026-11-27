import { Injectable } from '@nestjs/common';
import { ProductCatalog } from '../../../../common/ports/product-catalog.port';
import type {
  OrderCatalogProduct,
  OrderProductCatalog,
} from '../../app/ports/order-product-catalog.port';
import { TransactionCtx } from '../../../../common';

@Injectable()
export class OrderProductCatalogAdapter implements OrderProductCatalog {
  constructor(private readonly catalog: ProductCatalog) {}

  async findByIds(
    ids: readonly string[],
    tx: TransactionCtx,
  ): Promise<readonly OrderCatalogProduct[]> {
    const products = await this.catalog.findByIdsTx(ids, tx);

    return products.map(({ id, type, ...product }) => ({
      ...product,
      productId: id,
      productType: type,
    }));
  }
}
