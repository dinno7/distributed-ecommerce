import { OrderItemStatus } from './order-item.entity';
import { Order, OrderStatus } from './order.entity';

describe('Order', () => {
  afterEach(() => jest.useRealTimers());

  it('starts empty with a generated ID and current timestamps', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    jest.useFakeTimers({ now });
    const input = {
      customerId: 'customer',
    };

    const order = Order.create(input);

    expect(order).toBeInstanceOf(Order);
    expect(order).toMatchObject({
      ...input,
      totalMinor: 0n,
      currency: 'IRR',
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: now,
      updatedAt: now,
      items: [],
    });
    expect(order.id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i,
    );
    expect(Order.create(input).id).not.toBe(order.id);
  });

  it('adds pending items and updates the total and timestamp', () => {
    const createdAt = new Date('2026-01-01');
    const addedAt = new Date('2026-01-02');
    jest.useFakeTimers({ now: createdAt });
    const order = Order.create({ customerId: 'customer' });
    const items = [
      {
        productId: 'book',
        productType: 'DIGITAL',
        quantity: 1,
        unitPriceMinor: 150n,
      },
      {
        productId: 'mug',
        productType: 'PHYSICAL',
        quantity: 3,
        unitPriceMinor: 250n,
      },
    ] as const;

    jest.setSystemTime(addedAt);
    for (const item of items) order.addItem(item);

    expect(order.totalMinor).toBe(900n);
    expect(order.updatedAt).toEqual(addedAt);
    expect(order.items).toMatchObject(
      items.map((item) => ({
        ...item,
        status: OrderItemStatus.PENDING,
        attempts: 0,
      })),
    );
    expect(new Set(order.items.map(({ id }) => id)).size).toBe(items.length);
  });

  it.each([
    [0, 150n, 'Item quantity'],
    [1.5, 150n, 'Item quantity'],
    [1, -1n, 'Item price'],
    [2, 9_223_372_036_854_775_807n, '64-bit integer'],
  ] as const)(
    'rejects quantity %s and unit price %s when invalid',
    (quantity, unitPriceMinor, message) => {
      const order = Order.create({ customerId: 'customer' });
      expect(() =>
        order.addItem({
          productId: 'mug',
          productType: 'PHYSICAL',
          quantity,
          unitPriceMinor,
        }),
      ).toThrow(message);
      expect(order.items).toEqual([]);
      expect(order.totalMinor).toBe(0n);
    },
  );

  it('prices a total-only order from its first item', () => {
    const order = Order.create({ customerId: 'customer', totalMinor: 1500n });
    expect(order.totalMinor).toBe(1500n);

    order.addItem({
      productId: 'mug',
      productType: 'PHYSICAL',
      quantity: 2,
      unitPriceMinor: 250n,
    });

    expect(order.totalMinor).toBe(500n);
  });

  it('rejects item additions to an already paid order', () => {
    const now = new Date();
    const order = new Order(
      'order',
      'customer',
      OrderStatus.PAID,
      100n,
      'IRR',
      now,
      now,
    );

    expect(() =>
      order.addItem({
        productId: 'mug',
        productType: 'PHYSICAL',
        quantity: 1,
        unitPriceMinor: 50n,
      }),
    ).toThrow('Items can only be added to orders pending payment');

    expect(order.items).toEqual([]);
    expect(order.totalMinor).toBe(100n);
  });
});
