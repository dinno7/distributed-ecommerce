import type { ProductType } from '../../../common/types/product-type';

export const OrderItemStatus = {
  PENDING: 'PENDING',
  SKIPPED: 'SKIPPED',
  SUCCEEDED: 'SUCCEEDED',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type OrderItemStatus =
  (typeof OrderItemStatus)[keyof typeof OrderItemStatus];

export interface OrderItemSnapshot {
  readonly productId: string;
  readonly productType: ProductType;
  readonly subscriptionDays?: number | null;
  readonly quantity: number;
  readonly unitPriceMinor: bigint;
}

export interface OrderItem extends OrderItemSnapshot {
  readonly id: string;
  readonly status: OrderItemStatus;
  readonly attempts: number;
  readonly claimedBy: string | null;
  readonly leaseExpiresAt: Date | null;
  readonly lastError: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
