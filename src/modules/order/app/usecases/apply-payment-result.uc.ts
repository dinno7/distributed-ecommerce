import { Injectable } from '@nestjs/common';
import {
  OrderFailedEvent,
  type PaymentFailedEventPayload,
  type PaymentStartedEventPayload,
  type PaymentSucceededEventPayload,
} from '../../../../common/contracts/messages';
import { TransactionManager } from '../../../../common/ports/transaction.port';
import { fulfillmentCommand } from '../fulfillment-command';
import type { UseCase } from '../../../../common/ports/usecase.port';
import { OrderItemStatus } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order.entity';
import { OrderOutboxRepository } from '../ports/order-outbox.repository';
import { OrderWorkflowRepository } from '../ports/order.repository';

export type PaymentUpdate =
  | { kind: 'started'; payload: PaymentStartedEventPayload }
  | { kind: 'succeeded'; payload: PaymentSucceededEventPayload }
  | { kind: 'failed'; payload: PaymentFailedEventPayload };

export class InvalidPaymentAmountError extends Error {}

@Injectable()
export class ApplyPaymentResultUC implements UseCase<PaymentUpdate, void> {
  constructor(
    private readonly orders: OrderWorkflowRepository,
    private readonly outbox: OrderOutboxRepository,
    private readonly transactions: TransactionManager,
  ) {}

  async execute({ kind, payload }: PaymentUpdate): Promise<void> {
    const { orderId, attemptNo } = payload;
    await this.transactions.run(async (tx) => {
      const order = await this.orders.lock(orderId, tx);
      if (
        !order ||
        (order.status !== OrderStatus.PENDING_PAYMENT &&
          order.status !== OrderStatus.PAYMENT_FAILED)
      )
        return;
      if (attemptNo < order.paymentAttemptNo) return;
      if (
        attemptNo === order.paymentAttemptNo &&
        (kind === 'started' || order.status === OrderStatus.PAYMENT_FAILED)
      )
        return;

      if (
        kind === 'succeeded' &&
        (BigInt(payload.amountMinor) !== order.totalMinor ||
          payload.currency !== order.currency)
      ) {
        throw new InvalidPaymentAmountError();
      }
      const status =
        kind === 'succeeded'
          ? OrderStatus.FULFILLING
          : kind === 'failed'
            ? OrderStatus.PAYMENT_FAILED
            : OrderStatus.PENDING_PAYMENT;
      const itemStatus =
        kind === 'succeeded'
          ? OrderItemStatus.QUEUED
          : kind === 'failed'
            ? OrderItemStatus.SKIPPED
            : OrderItemStatus.PENDING;
      await this.orders.updateState(
        orderId,
        status,
        {
          ids: order.items.map((item) => item.id),
          status: itemStatus,
          attempts: kind === 'succeeded' ? 1 : 0,
          lastError: null,
        },
        tx,
        attemptNo,
      );

      if (kind === 'succeeded') {
        for (const item of order.items) {
          await this.outbox.stage(fulfillmentCommand(order, item, 1), tx);
        }
      } else if (kind === 'failed') {
        await this.outbox.stage(
          new OrderFailedEvent({ orderId, reason: payload.errorCode }),
          tx,
        );
      }
    });
  }
}
