import { Test, type TestingModule } from '@nestjs/testing';
import { PersistenceModule } from '../../../../common/infra/persistence/persistence.module';
import { PrismaService } from '../../../../common/infra/persistence/prisma.service';
import { ProductType } from '../../../../common/types/product-type';
import { OrderModule } from '../../order.module';
import { OrderProductCatalog } from '../ports/order-product-catalog.port';
import { CreateOrderUC } from './create-order.uc';

describe('CreateOrderUC catalog checks', () => {
  const findMany = jest.fn();
  const mug = {
    id: '019338a0-0000-7000-8000-00000000000a',
    type: ProductType.PHYSICAL,
    unitPriceMinor: 250n,
    inventory: { available: 3 },
    subscriptionDays: null,
    digitalMetadata: null,
  };
  const book = {
    id: '019338a0-0000-7000-8000-00000000000b',
    type: ProductType.DIGITAL,
    unitPriceMinor: 100n,
    inventory: null,
    subscriptionDays: null,
    digitalMetadata: { format: 'epub' },
  };
  let module: TestingModule;
  let useCase: CreateOrderUC;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PersistenceModule, OrderModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ product: { findMany } })
      .compile();
    useCase = module.get(CreateOrderUC);
  });

  beforeEach(() => findMany.mockReset());
  afterAll(async () => module?.close());

  it('uses one catalog lookup to price all items and check physical stock', async () => {
    findMany.mockResolvedValueOnce([book, mug]);

    const order = await useCase.execute({
      customerId: 'customer',
      items: [
        { productId: mug.id.toUpperCase(), quantity: 3 },
        { productId: book.id, quantity: 1 },
      ],
    });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [mug.id, book.id] } } }),
    );
    expect(order.totalMinor).toBe(850n);
    expect(order.items).toMatchObject([
      {
        productId: mug.id,
        productType: mug.type,
        unitPriceMinor: mug.unitPriceMinor,
        quantity: 3,
      },
      {
        productId: book.id,
        productType: book.type,
        unitPriceMinor: book.unitPriceMinor,
        quantity: 1,
      },
    ]);
  });

  it('exposes catalog details through the Orders port', async () => {
    findMany.mockResolvedValueOnce([book, mug]);

    const products = await module
      .get(OrderProductCatalog)
      .findByIds([book.id, mug.id]);

    expect(products).toMatchObject([
      {
        productId: book.id,
        availableStock: null,
        digitalMetadata: book.digitalMetadata,
      },
      { productId: mug.id, availableStock: 3 },
    ]);
  });

  it('rejects a product missing from the catalog', async () => {
    findMany.mockResolvedValueOnce([]);

    await expect(
      useCase.execute({
        customerId: 'customer',
        items: [{ productId: mug.id, quantity: 1 }],
      }),
    ).rejects.toThrow(`Product ${mug.id} not found`);
  });

  it('rejects a physical quantity above available stock', async () => {
    findMany.mockResolvedValueOnce([mug]);

    await expect(
      useCase.execute({
        customerId: 'customer',
        items: [{ productId: mug.id, quantity: 4 }],
      }),
    ).rejects.toThrow(`Insufficient stock for product ${mug.id}`);
  });

  it('rejects duplicate products before checking stock', async () => {
    await expect(
      useCase.execute({
        customerId: 'customer',
        items: [
          { productId: mug.id, quantity: 2 },
          { productId: mug.id, quantity: 2 },
        ],
      }),
    ).rejects.toThrow('An order requires distinct products');
    expect(findMany).not.toHaveBeenCalled();
  });
});
