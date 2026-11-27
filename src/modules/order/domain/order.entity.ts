import { randomUUIDv7 } from 'node:crypto';
import { Money } from '../../../common/value-objects/money';
import type { OrderItem, OrderItemSnapshot } from './order-item.entity';
import { OrderItemStatus } from './order-item.entity';

export const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  FULFILLING: 'FULFILLING',
  FULFILLMENT_FAILED: 'FULFILLMENT_FAILED',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export class Order {
  #items: readonly OrderItem[];
  #totalMinor: bigint;
  #updatedAt: Date;

  constructor(
    readonly id: string,
    readonly customerId: string,
    readonly status: OrderStatus,
    totalMinor: bigint,
    readonly currency: string,
    readonly createdAt: Date,
    updatedAt: Date,
    items: readonly OrderItem[] = [],
    readonly paymentAttemptNo = 0,
  ) {
    this.#items = Object.freeze([...items]);
    this.#totalMinor = totalMinor;
    this.#updatedAt = updatedAt;
  }

  get items(): readonly OrderItem[] {
    return this.#items;
  }

  get itemsCount(): number {
    return this.#items.length;
  }

  get totalMinor(): bigint {
    return this.#totalMinor;
  }

  get updatedAt(): Date {
    return this.#updatedAt;
  }

  static create({
    customerId,
    totalMinor = 0n,
    currency = 'IRR',
  }: {
    customerId: string;
    totalMinor?: bigint;
    currency?: string;
  }): Order {
    const now = new Date();

    return new Order(
      randomUUIDv7(),
      customerId,
      OrderStatus.PENDING_PAYMENT,
      totalMinor,
      currency,
      now,
      new Date(now),
    );
  }

  addItem({
    productId,
    productType,
    quantity,
    unitPriceMinor,
    subscriptionDays,
  }: OrderItemSnapshot): void {
    if (this.status !== OrderStatus.PENDING_PAYMENT) {
      throw new Error('Items can only be added to orders pending payment');
    }
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 2_147_483_647
    ) {
      throw new RangeError('Item quantity must be a positive 32-bit integer');
    }
    if (unitPriceMinor < 0n)
      throw new RangeError('Item price must be nonnegative');

    // A total-only order starts pricing from its first item.
    const itemSubtotal = this.#items.length === 0 ? 0n : this.#totalMinor;
    const total = new Money(itemSubtotal + unitPriceMinor * BigInt(quantity));
    const now = new Date();
    const item: OrderItem = Object.freeze({
      id: randomUUIDv7(),
      productId,
      productType,
      quantity,
      unitPriceMinor,
      ...(subscriptionDays != null ? { subscriptionDays } : {}),
      status: OrderItemStatus.PENDING,
      attempts: 0,
      claimedBy: null,
      leaseExpiresAt: null,
      lastError: null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });

    this.#items = Object.freeze([...this.#items, item]);
    this.#totalMinor = total.minorUnits;
    this.#updatedAt = now;
  }
}
