import { Injectable } from '@nestjs/common';
import type { ConsumeMessage } from 'amqplib';
import { isUUID } from 'class-validator';
import { EXCHANGES } from '../../../../common/contracts/exchanges';
import type {
  FulfillmentItemMessage,
  PaymentFailedEventPayload,
  PaymentStartedEventPayload,
  PaymentSucceededEventPayload,
} from '../../../../common/contracts/messages';
import {
  fulfillmentResultTypes as outcomes,
  orderFulfillmentQueue,
  orderPaymentQueue,
} from './order-workflow.routes';
import { ROUTING_KEYS } from '../../../../common/contracts/routing-keys';
import {
  NonRetryableError,
  RabbitRetrieableSubscriber,
} from '../../../../common/messaging/infra/retrier-error-handler';
import { isPositiveInt32 } from '../../../../common/utils/positive-int32';
import { ApplyFulfillmentOutcomeUC } from '../../app/usecases/apply-fulfillment-outcome.uc';
import {
  ApplyPaymentResultUC,
  InvalidPaymentAmountError,
} from '../../app/usecases/apply-payment-result.uc';

@Injectable()
export class OrderWorkflowConsumer {
  constructor(
    private readonly applyPayment: ApplyPaymentResultUC,
    private readonly applyOutcome: ApplyFulfillmentOutcomeUC,
  ) {}

  @RabbitRetrieableSubscriber({
    exchange: EXCHANGES.MAIN,
    routingKey: orderPaymentQueue.routingKey,
    queue: orderPaymentQueue.name,
  })
  async payment(
    payload: PaymentStartedEventPayload,
    message: ConsumeMessage,
  ): Promise<void> {
    if (
      !isUUID(payload?.orderId) ||
      !isUUID(payload.paymentId) ||
      !isPositiveInt32(payload.attemptNo)
    ) {
      throw new NonRetryableError('Invalid payment event identity');
    }

    switch (message.fields.routingKey) {
      case ROUTING_KEYS.PaymentStarted:
        return this.applyPayment.execute({ kind: 'started', payload });
      case ROUTING_KEYS.PaymentFailed: {
        const failed = payload as PaymentFailedEventPayload;
        if (
          failed.errorCode !== 'PAYMENT_DECLINED' &&
          failed.errorCode !== 'PAYMENT_TIMED_OUT'
        ) {
          throw new NonRetryableError('Invalid payment failure code');
        }
        return this.applyPayment.execute({ kind: 'failed', payload: failed });
      }
      case ROUTING_KEYS.PaymentSucceeded: {
        const succeeded = payload as PaymentSucceededEventPayload;
        if (
          succeeded.currency !== 'IRR' ||
          typeof succeeded.amountMinor !== 'string' ||
          !/^\d{1,19}$/.test(succeeded.amountMinor)
        ) {
          throw new NonRetryableError('Invalid payment amount');
        }
        try {
          await this.applyPayment.execute({
            kind: 'succeeded',
            payload: succeeded,
          });
        } catch (error) {
          if (error instanceof InvalidPaymentAmountError) {
            throw new NonRetryableError('Payment amount does not match order');
          }
          throw error;
        }
        return;
      }
      default:
        throw new NonRetryableError('Unexpected payment routing key');
    }
  }

  @RabbitRetrieableSubscriber({
    exchange: EXCHANGES.MAIN,
    routingKey: orderFulfillmentQueue.routingKey,
    queue: orderFulfillmentQueue.name,
  })
  async outcome(
    payload: FulfillmentItemMessage & { errorCode?: string },
    message: ConsumeMessage,
  ): Promise<void> {
    if (
      !isUUID(payload?.orderId) ||
      !isUUID(payload.orderItemId) ||
      !isPositiveInt32(payload.attemptNo)
    ) {
      throw new NonRetryableError('Invalid fulfillment item identity');
    }
    const route = message.fields.routingKey;
    if (!Object.hasOwn(outcomes, route))
      throw new NonRetryableError('Unexpected fulfillment routing key');
    let errorCode: string | null = null;
    if (route.endsWith('.failed')) {
      if (
        typeof payload.errorCode !== 'string' ||
        !/^[A-Z_]{1,64}$/.test(payload.errorCode)
      ) {
        throw new NonRetryableError('Invalid fulfillment failure code');
      }
      errorCode = payload.errorCode;
    }
    await this.applyOutcome.execute({
      ...payload,
      productType: outcomes[route as keyof typeof outcomes],
      errorCode,
    });
  }
}
