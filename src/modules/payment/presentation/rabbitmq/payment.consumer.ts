import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { EXCHANGES } from '../../../../common/contracts/exchanges';
import {
  OrderCreatedEvent,
  type OrderCreatedEventPayload,
} from '../../../../common/contracts/messages';
import { QUEUES } from '../../../../common/contracts/queues';
import {
  NonRetryableError,
  RabbitRetrieableSubscriber,
} from '../../../../common/messaging/infra/retrier-error-handler';
import { Money } from '../../../../common/value-objects/money';
import { PreparePaymentUC } from '../../app/usecases/prepare-payment.uc';

@Injectable()
export class PaymentConsumer {
  constructor(private readonly preparePayment: PreparePaymentUC) {}

  @RabbitRetrieableSubscriber({
    exchange: EXCHANGES.MAIN,
    routingKey: OrderCreatedEvent.ROUTING_KEY,
    queue: QUEUES.PaymentProcess,
    maxRetriesCount: 3,
  })
  async onOrderCreated(payload: OrderCreatedEventPayload): Promise<void> {
    if (
      !isUUID(payload?.orderId) ||
      payload.currency !== 'IRR' ||
      typeof payload.totalMinor !== 'string' ||
      !/^\d{1,19}$/.test(payload.totalMinor)
    ) {
      throw new NonRetryableError('Invalid OrderCreated payment details');
    }

    let amount: Money;
    try {
      amount = new Money(BigInt(payload.totalMinor));
    } catch {
      throw new NonRetryableError('Invalid OrderCreated payment amount');
    }

    await this.preparePayment.execute({
      orderId: payload.orderId,
      amount,
      gatewayName: 'mock',
    });
  }
}
