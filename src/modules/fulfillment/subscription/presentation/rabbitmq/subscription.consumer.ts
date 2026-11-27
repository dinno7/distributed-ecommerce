import { Injectable } from '@nestjs/common';
import { EXCHANGES } from '../../../../../common/contracts/exchanges';
import type { ActivateSubscriptionCommandPayload } from '../../../../../common/contracts/messages';
import { QUEUES } from '../../../../../common/contracts/queues';
import { ROUTING_KEYS } from '../../../../../common/contracts/routing-keys';
import {
  NonRetryableError,
  RabbitRetrieableSubscriber,
} from '../../../../../common/messaging/infra/retrier-error-handler';
import { validateFulfillmentCommand } from '../../../presentation/rabbitmq/fulfillment-command.validation';
import { isPositiveInt32 } from '../../../../../common/utils/positive-int32';
import { ActivateSubscriptionUC } from '../../app/usecases/subscription.use-case';

@Injectable()
export class SubscriptionConsumer {
  constructor(private readonly useCase: ActivateSubscriptionUC) {}

  @RabbitRetrieableSubscriber({
    exchange: EXCHANGES.MAIN,
    routingKey: ROUTING_KEYS.ActivateSubscription,
    queue: QUEUES.FulfillSubscription,
  })
  async consume(payload: ActivateSubscriptionCommandPayload): Promise<void> {
    validateFulfillmentCommand(payload);
    if (
      payload.durationDays !== null &&
      !isPositiveInt32(payload.durationDays)
    ) {
      throw new NonRetryableError('Invalid subscription duration');
    }
    await this.useCase.execute(payload);
  }
}
