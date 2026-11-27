import { Test, type TestingModule } from '@nestjs/testing';
import { PersistenceModule } from '../../../../common/infra/persistence/persistence.module';
import { PrismaService } from '../../../../common/infra/persistence/prisma.service';
import { LatestPaymentQuery } from '../../../../common/ports/latest-payment-query.port';
import { ProductCatalog } from '../../../../common/ports/product-catalog.port';
import { ShipmentQuery } from '../../../../common/ports/shipment-query.port';
import {
  TransactionManager,
  type TransactionCtx,
} from '../../../../common/ports/transaction.port';
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
    unitPriceMinor: 250n,
    availableStock: 3,
    subscriptionDays: null,
    digitalMetadata: null,
  };
  const book = {
    id: '019338a0-0000-7000-8000-00000000000b',
    type: ProductType.DIGITAL,
    unitPriceMinor: 100n,
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
        if (token === ProductCatalog) return { findByIdsTx: findProducts };
        if (token === LatestPaymentQuery) return { execute: jest.fn() };
        if (token === ShipmentQuery) return { listShipments: jest.fn() };
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
    expect(findProducts).toHaveBeenCalledWith([mug.id, book.id], tx);
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
    findProducts.mockResolvedValueOnce([book, mug]);

    const catalog = module.get(OrderProductCatalog);
    const products = await module
      .get(TransactionManager)
      .run((transaction) => catalog.findByIds([book.id, mug.id], transaction));

    expect(products).toMatchObject([
      {
        productId: book.id,
        availableStock: null,
        digitalMetadata: book.digitalMetadata,
      },
      { productId: mug.id, availableStock: 3 },
    ]);
  });

  it('writes the order and outbox using the supplied transaction', async () => {
    findProducts.mockResolvedValueOnce([book]);
    const createOrder = jest.fn();
    const stageEvent = jest.fn();
    const callerTx = {
      order: { create: createOrder },
      orderOutbox: { create: stageEvent },
    };

    await useCase.execute({
      customerId: 'customer',
      items: [{ productId: book.id, quantity: 1 }],
      tx: callerTx as TransactionCtx,
    });

    expect(transaction).not.toHaveBeenCalled();
    expect(findProducts).toHaveBeenCalledWith([book.id], callerTx);
    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(stageEvent).toHaveBeenCalledTimes(1);
  });

  it('returns a bad request error for a product missing from the catalog', async () => {
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
