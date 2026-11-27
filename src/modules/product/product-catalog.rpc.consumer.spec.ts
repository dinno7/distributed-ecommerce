import { Nack } from '@golevelup/nestjs-rabbitmq';
import { ProductType } from '../../common/types/product-type';
import { ProductCatalogRpcConsumer } from './product-catalog.rpc.consumer';
import type { ProductService } from './product.service';

describe('ProductCatalogRpcConsumer', () => {
  const findByIds = jest.fn();
  const consumer = new ProductCatalogRpcConsumer({
    findByIds,
  } as unknown as ProductService);

  beforeEach(() => findByIds.mockReset());

  it('returns exact prices as JSON strings', async () => {
    const id = '019338a0-0000-7000-8000-00000000000a';
    const product = {
      id,
      type: ProductType.DIGITAL,
      unitPriceMinor: 9_007_199_254_740_993n,
      availableStock: null,
      subscriptionDays: null,
      digitalMetadata: { format: 'epub' },
    };
    findByIds.mockResolvedValueOnce([product]);

    await expect(consumer.findByIds({ ids: [id] })).resolves.toEqual([
      { ...product, unitPriceMinor: '9007199254740993' },
    ]);
    expect(findByIds).toHaveBeenCalledWith([id]);
  });

  it('drops invalid requests before querying products', async () => {
    await expect(
      consumer.findByIds({ ids: ['invalid-uuid'] }),
    ).resolves.toEqual(new Nack(false));
    expect(findByIds).not.toHaveBeenCalled();
  });
});
