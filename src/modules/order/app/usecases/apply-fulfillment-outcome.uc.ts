import { Injectable } from '@nestjs/common';
import {
  OrderCompletedEvent,
  OrderFailedEvent,
  type FulfillmentItemMessage,
} from '../../../../common/contracts/messages';
import { TransactionManager } from '../../../../common/ports/transaction.port';
import type { ProductType } from '../../../../common/types/product-type';
import type { UseCase } from '../../../../common/ports/usecase.port';
import { OrderItemStatus } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order.entity';
import { OrderOutboxRepository } from '../ports/order-outbox.repository';
import { OrderWorkflowRepository } from '../ports/order.repository';

export interface ApplyFulfillmentOutcomeInput extends FulfillmentItemMessage {
  productType: ProductType;
  errorCode: string | null;
}

@Injectable()
export class ApplyFulfillmentOutcomeUC implements UseCase<
  ApplyFulfillmentOutcomeInput,
  void
> {
  constructor(
    private readonly orders: OrderWorkflowRepository,
    private readonly outbox: OrderOutboxRepository,
    private readonly transactions: TransactionManager,
  ) {}

  async execute({
    orderId,
    orderItemId,
    attemptNo,
    productType,
    errorCode,
  }: ApplyFulfillmentOutcomeInput): Promise<void> {
    await this.transactions.run(async (tx) => {
      const order = await this.orders.lock(orderId, tx);
      if (order?.status !== OrderStatus.FULFILLING) return;
      const item = order.items.find(
        (candidate) => candidate.id === orderItemId,
      );
      if (
        item?.status !== OrderItemStatus.QUEUED ||
        item.attempts !== attemptNo ||
        item.productType !== productType
      )
        return;

      const others = order.items.filter(
        (candidate) => candidate.id !== item.id,
      );
      let orderStatus: OrderStatus = OrderStatus.FULFILLING;
      if (
        others.every((candidate) => candidate.status !== OrderItemStatus.QUEUED)
      ) {
        if (
          errorCode ||
          others.some(
            (candidate) => candidate.status === OrderItemStatus.FAILED,
          )
        ) {
          orderStatus = OrderStatus.FULFILLMENT_FAILED;
        } else if (
          others.every(
            (candidate) => candidate.status === OrderItemStatus.SUCCEEDED,
          )
        ) {
          orderStatus = OrderStatus.COMPLETED;
        }
      }

      await this.orders.updateState(
        orderId,
        orderStatus,
        {
          ids: [item.id],
          status: errorCode
            ? OrderItemStatus.FAILED
            : OrderItemStatus.SUCCEEDED,
          attempts: attemptNo,
          lastError: errorCode,
        },
        tx,
      );

      if (orderStatus === OrderStatus.COMPLETED) {
        await this.outbox.stage(
          new OrderCompletedEvent({
            orderId,
            completedAt: new Date().toISOString(),
          }),
          tx,
        );
      } else if (orderStatus === OrderStatus.FULFILLMENT_FAILED) {
        await this.outbox.stage(
          new OrderFailedEvent({ orderId, reason: 'FULFILLMENT_FAILED' }),
          tx,
        );
      }
    });
  }
}
