import {
  defaultNackErrorHandler,
  Nack,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  PRODUCT_CATALOG_MAX_IDS,
  PRODUCT_CATALOG_RPC,
  type CatalogProductResponse,
} from '../../common/contracts/product-catalog.rpc';
import { ProductService } from './product.service';

@Injectable()
export class ProductCatalogRpcConsumer {
  constructor(private readonly products: ProductService) {}

  @RabbitRPC({
    ...PRODUCT_CATALOG_RPC,
    queueOptions: { durable: true },
    errorHandler: defaultNackErrorHandler,
  })
  async findByIds(payload: unknown): Promise<CatalogProductResponse[] | Nack> {
    const ids =
      payload && typeof payload === 'object' && 'ids' in payload
        ? payload.ids
        : undefined;
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > PRODUCT_CATALOG_MAX_IDS ||
      !ids.every((id): id is string => typeof id === 'string' && isUUID(id))
    ) {
      return new Nack(false);
    }

    const products = await this.products.findByIds(ids);
    return products.map(({ unitPriceMinor, ...product }) => ({
      ...product,
      unitPriceMinor: unitPriceMinor.toString(),
    }));
  }
}
