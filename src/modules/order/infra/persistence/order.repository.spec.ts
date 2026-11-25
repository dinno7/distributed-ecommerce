import { Test, type TestingModule } from '@nestjs/testing';
import { PersistenceModule } from '../../../../common/infra/persistence/persistence.module';
import { PrismaService } from '../../../../common/infra/persistence/prisma.service';
import { TransactionManager } from '../../../../common/ports/transaction.port';
import { OrderRepository } from '../../app/ports/order.repository';
import { OrderItemStatus } from '../../domain/order-item.entity';
import { Order, OrderStatus } from '../../domain/order.entity';
import { OrderModule } from '../../order.module';

describe('OrderRepositoryPrisma', () => {
  const tx = { order: { create: jest.fn() } };
  const findUnique = jest.fn();
  let module: TestingModule;
  let repository: OrderRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PersistenceModule, OrderModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        order: { findUnique },
        $transaction: (run: (transaction: typeof tx) => Promise<unknown>) =>
          run(tx),
      })
      .compile();
    repository = module.get(OrderRepository);
  });

  afterAll(async () => module?.close());

  it('creates the order and its items using the supplied transaction', async () => {
    const order = Order.create({ customerId: 'customer' });
    order.addItem({
      productId: 'mug',
      productType: 'PHYSICAL',
      quantity: 1,
      unitPriceMinor: 9_007_199_254_740_993n,
    });

    await module
      .get(TransactionManager)
      .run((transaction) => repository.create(order, transaction));

    expect(tx.order.create).toHaveBeenCalledWith({
      data: {
        id: order.id,
        userId: order.customerId,
        status: order.status,
        totalMinor: order.totalMinor,
        currency: order.currency,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: { create: [...order.items] },
      },
    });
  });

  it('reconstitutes a stored order with its related items', async () => {
    const row = {
      id: 'order',
      customerId: 'customer',
      status: OrderStatus.COMPLETED,
      totalMinor: 9_007_199_254_740_993n,
      currency: 'IRR',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    };
    const item = {
      id: 'item',
      productId: 'mug',
      productType: 'PHYSICAL',
      quantity: 1,
      unitPriceMinor: row.totalMinor,
      status: OrderItemStatus.COMPLETED,
      attempts: 2,
      claimedBy: null,
      leaseExpiresAt: null,
      lastError: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    const { customerId, ...orderFields } = row;
    findUnique.mockResolvedValueOnce({
      ...orderFields,
      userId: customerId,
      items: [{ ...item, orderId: row.id }],
    });

    const order = await repository.findById(row.id);

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: row.id },
      include: { items: true },
    });
    expect(order).toBeInstanceOf(Order);
    expect(order).toMatchObject(row);
    expect(order?.items).toEqual([item]);
  });

  it('returns null for a missing order', async () => {
    findUnique.mockResolvedValueOnce(null);

    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});
