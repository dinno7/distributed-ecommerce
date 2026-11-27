import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { PersistenceModule } from '../../../../common/infra/persistence/persistence.module';
import { PrismaService } from '../../../../common/infra/persistence/prisma.service';
import { PRODUCT_CATALOG_RPC } from '../../../../common/contracts/product-catalog.rpc';
import {
  MessagePublisher,
  MessageRequestTimeoutError,
} from '../../../../common/messaging/ports/message-publisher.port';
import { ProductType } from '../../../../common/types/product-type';
import { OrderModule } from '../../order.module';
import { OrderOutboxRelay } from '../outbox.relay';
import { OrderProductCatalog } from '../ports/order-product-catalog.port';
import { CreateOrderUC } from './create-order.uc';

describe('CreateOrderUC catalog checks', () => {
  const findProducts = jest.fn();
  const tx = {
    order: { create: jest.fn() },
    orderOutbox: { create: jest.fn() },
  };
  const transaction = jest.fn(
    (run: (transaction: typeof tx) => Promise<unknown>) => run(tx),
  );
  const mug = {
    id: '019338a0-0000-7000-8000-00000000000a',
    type: ProductType.PHYSICAL,
    unitPriceMinor: '250',
    availableStock: 3,
    subscriptionDays: null,
    digitalMetadata: null,
  };
  const book = {
    id: '019338a0-0000-7000-8000-00000000000b',
    type: ProductType.DIGITAL,
    unitPriceMinor: '100',
    availableStock: null,
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
      .useValue({
        $transaction: transaction,
      })
      .overrideProvider(OrderOutboxRelay)
      .useValue({})
      .useMocker((token) => {
        if (token === ConfigService) return {};
        if (token === MessagePublisher) return { request: findProducts };
      })
      .compile();
    useCase = module.get(CreateOrderUC);
  });

  beforeEach(() => {
    findProducts.mockReset();
    transaction.mockClear();
  });
  afterAll(async () => module?.close());

  it('uses one catalog lookup to price all items and check physical stock', async () => {
    findProducts.mockResolvedValueOnce([book, mug]);

    const order = await useCase.execute({
      customerId: 'customer',
      items: [
        { productId: mug.id.toUpperCase(), quantity: 3 },
        { productId: book.id, quantity: 1 },
      ],
    });

    expect(findProducts).toHaveBeenCalledTimes(1);
    expect(findProducts).toHaveBeenCalledWith({
      exchange: PRODUCT_CATALOG_RPC.exchange,
      routingKey: PRODUCT_CATALOG_RPC.routingKey,
      payload: { ids: [mug.id, book.id] },
    });
    expect(findProducts.mock.invocationCallOrder[0]).toBeLessThan(
      transaction.mock.invocationCallOrder[0],
    );
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(tx.orderOutbox.create).toHaveBeenCalledTimes(1);
    expect(order.totalMinor).toBe(850n);
    expect(order.items).toMatchObject([
      {
        productId: mug.id,
        productType: mug.type,
        unitPriceMinor: 250n,
        quantity: 3,
      },
      {
        productId: book.id,
        productType: book.type,
        unitPriceMinor: 100n,
        quantity: 1,
      },
    ]);
  });

  it('exposes catalog details through the Orders port', async () => {
    findProducts.mockResolvedValueOnce([book, mug]);

    const catalog = module.get(OrderProductCatalog);
    const products = await catalog.findByIds([book.id, mug.id]);

    expect(products).toMatchObject([
      {
        productId: book.id,
        availableStock: null,
        digitalMetadata: book.digitalMetadata,
      },
      { productId: mug.id, availableStock: 3 },
    ]);
  });

  it('returns 404 for a product missing from the catalog', async () => {
    findProducts.mockResolvedValueOnce([]);

    await expect(
      useCase.execute({
        customerId: 'customer',
        items: [{ productId: mug.id, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      message: `Product ${mug.id} not found`,
      response: { statusCode: 404 },
    });
  });

  it.each([
    [new MessageRequestTimeoutError(), 504],
    [new Error('Broker unavailable'), 503],
  ])(
    'rejects an RPC failure before opening a transaction (%p)',
    async (error, status) => {
      findProducts.mockRejectedValueOnce(error);

      await expect(
        useCase.execute({
          customerId: 'customer',
          items: [{ productId: mug.id, quantity: 1 }],
        }),
      ).rejects.toMatchObject({ status });
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects malformed catalog replies before opening a transaction', async () => {
    findProducts.mockResolvedValueOnce([{ ...mug, unitPriceMinor: 250 }]);

    await expect(
      useCase.execute({
        customerId: 'customer',
        items: [{ productId: mug.id, quantity: 1 }],
      }),
    ).rejects.toMatchObject({ status: 502 });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a physical quantity above available stock', async () => {
    findProducts.mockResolvedValueOnce([mug]);

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
    expect(findProducts).not.toHaveBeenCalled();
  });
});
