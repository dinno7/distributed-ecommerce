import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PRODUCT_CATALOG_RPC,
  type CatalogProductResponse,
} from '../../../../common/contracts/product-catalog.rpc';
import {
  MessagePublisher,
  MessageRequestTimeoutError,
} from '../../../../common/messaging/ports/message-publisher.port';
import { ProductType } from '../../../../common/types/product-type';
import { Money } from '../../../../common/value-objects/money';
import type {
  OrderCatalogProduct,
  OrderProductCatalog,
} from '../../app/ports/order-product-catalog.port';

@Injectable()
export class OrderProductCatalogAdapter implements OrderProductCatalog {
  constructor(private readonly publisher: MessagePublisher) {}

  async findByIds(
    ids: readonly string[],
  ): Promise<readonly OrderCatalogProduct[]> {
    let reply: unknown;
    try {
      reply = await this.publisher.request({
        exchange: PRODUCT_CATALOG_RPC.exchange,
        routingKey: PRODUCT_CATALOG_RPC.routingKey,
        payload: { ids: [...ids] },
      });
    } catch (cause) {
      if (cause instanceof MessageRequestTimeoutError) {
        throw new GatewayTimeoutException('Product catalog timed out', {
          cause,
        });
      }
      throw new ServiceUnavailableException('Product catalog unavailable', {
        cause,
      });
    }

    const pendingIds = new Set(ids);
    if (
      !Array.isArray(reply) ||
      reply.length > ids.length ||
      !reply.every(
        (product): product is CatalogProductResponse =>
          isCatalogProduct(product) && pendingIds.delete(product.id),
      )
    ) {
      throw new BadGatewayException('Invalid product catalog reply');
    }

    return reply.map(({ id, type, unitPriceMinor, ...product }) => {
      let price: Money;
      try {
        price = new Money(BigInt(unitPriceMinor));
      } catch (cause) {
        throw new BadGatewayException('Invalid product catalog price', {
          cause,
        });
      }
      return {
        ...product,
        productId: id,
        productType: type,
        unitPriceMinor: price.minorUnits,
      };
    });
  }
}

function isCatalogProduct(value: unknown): value is CatalogProductResponse {
  if (!value || typeof value !== 'object') return false;
  const product = value as Partial<CatalogProductResponse>;
  return (
    typeof product.id === 'string' &&
    Object.values(ProductType).some((type) => type === product.type) &&
    typeof product.unitPriceMinor === 'string' &&
    /^(0|[1-9]\d{0,18})$/.test(product.unitPriceMinor) &&
    (product.availableStock === null ||
      Number.isInteger(product.availableStock)) &&
    (product.subscriptionDays === null ||
      Number.isInteger(product.subscriptionDays)) &&
    product.digitalMetadata !== undefined
  );
}
