import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderRetryScheduledEvent } from '../../../../common/contracts/messages';
import { TransactionManager } from '../../../../common/ports/transaction.port';
import { fulfillmentCommand } from '../fulfillment-command';
import type { UseCase } from '../../../../common/ports/usecase.port';
import { OrderItemStatus } from '../../domain/order-item.entity';
import { OrderStatus } from '../../domain/order.entity';
import { OrderOutboxRepository } from '../ports/order-outbox.repository';
import { OrderWorkflowRepository } from '../ports/order.repository';

interface RetryOrderFulfillmentInput {
  orderId: string;
  itemId?: string;
}

type RetryOrderFulfillmentResult = {
  orderId: string;
  status: typeof OrderStatus.FULFILLING;
  itemIds: string[];
};

@Injectable()
export class RetryOrderFulfillmentUC implements UseCase<
  RetryOrderFulfillmentInput,
  RetryOrderFulfillmentResult
> {
  constructor(
    private readonly orders: OrderWorkflowRepository,
    private readonly outbox: OrderOutboxRepository,
    private readonly transactions: TransactionManager,
  ) {}

  execute({
    orderId,
    itemId,
  }: RetryOrderFulfillmentInput): Promise<RetryOrderFulfillmentResult> {
    return this.transactions.run(async (tx) => {
      const order = await this.orders.lock(orderId, tx);
      if (!order) throw new NotFoundException('Order not found');
      const selected = itemId
        ? order.items.filter((item) => item.id === itemId)
        : order.items;
      if (selected.length === 0)
        throw new NotFoundException('Order item not found');

      const eligible = selected.filter(
        (item) =>
          item.status === OrderItemStatus.FAILED &&
          item.lastError === 'OUT_OF_STOCK' &&
          item.attempts < 2_147_483_647,
      );
      if (
        order.status !== OrderStatus.FULFILLMENT_FAILED ||
        eligible.length === 0
      ) {
        throw new ConflictException({
          code: 'RETRY_NOT_ELIGIBLE',
          message: 'No eligible failed items',
        });
      }

      for (const item of eligible) {
        const attemptNo = item.attempts + 1;
        await this.orders.updateState(
          orderId,
          OrderStatus.FULFILLING,
          {
            ids: [item.id],
            status: OrderItemStatus.QUEUED,
            attempts: attemptNo,
            lastError: null,
          },
          tx,
        );
        await this.outbox.stage(
          new OrderRetryScheduledEvent({
            orderId,
            orderItemId: item.id,
            reason: 'OUT_OF_STOCK',
            attemptNo,
          }),
          tx,
        );
        await this.outbox.stage(fulfillmentCommand(order, item, attemptNo), tx);
      }
      return {
        orderId,
        status: OrderStatus.FULFILLING,
        itemIds: eligible.map((item) => item.id),
      };
    });
  }
}
