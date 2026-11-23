import { Money } from '../../common/value-objects/money';
import { Product, ProductType } from './entities/product.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { Test } from '@nestjs/testing';

describe('ProductController', () => {
  it('serializes a product with an exact decimal price and optional stock', async () => {
    const id = '019338a0-0000-7000-8000-000000000001';
    const findOne = jest
      .fn()
      .mockResolvedValue(
        new Product(
          id,
          'Keyboard',
          ProductType.PHYSICAL,
          new Money(9_007_199_254_740_993n),
          null,
          null,
          0,
        ),
      );
    const module = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: { findOne } }],
    }).compile();

    const response = await module.get(ProductController).findOne(id);

    expect(findOne).toHaveBeenCalledWith(id);
    expect(JSON.parse(JSON.stringify(response))).toEqual({
      id,
      name: 'Keyboard',
      type: 'PHYSICAL',
      unitPriceMinor: '9007199254740993',
      currency: 'IRR',
      availableStock: 0,
    });
  });
});
