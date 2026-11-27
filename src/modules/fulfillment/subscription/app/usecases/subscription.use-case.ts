import { Injectable } from '@nestjs/common';
import type { ActivateSubscriptionCommandPayload } from '../../../../../common/contracts/messages';
import { ROUTING_KEYS } from '../../../../../common/contracts/routing-keys';
import { FulfillmentAttemptRunner } from '../../../app/fulfillment-attempt';
import { purchasedDays } from '../../domain/purchased-duration';

import { Subscriptions } from '../ports/subscription.port';

@Injectable()
export class ActivateSubscriptionUC {
  constructor(
    private readonly runner: FulfillmentAttemptRunner,
    private readonly subscriptions: Subscriptions,
  ) {}

  execute(command: ActivateSubscriptionCommandPayload): Promise<void> {
    return this.runner.run(
      command,
      {
        started: ROUTING_KEYS.SubscriptionStarted,
        succeeded: ROUTING_KEYS.SubscriptionSucceeded,
        failed: ROUTING_KEYS.SubscriptionFailed,
      },
      async (tx) => {
        if (command.durationDays === null)
          return { errorCode: 'SUBSCRIPTION_SNAPSHOT_MISSING' };
        const updated = await this.subscriptions.extend(
          command.customerId,
          command.productId,
          purchasedDays(command.durationDays, command.quantity),
          tx,
        );
        return updated
          ? {}
          : { errorCode: 'SUBSCRIPTION_DURATION_OUT_OF_RANGE' };
      },
    );
  }
}
