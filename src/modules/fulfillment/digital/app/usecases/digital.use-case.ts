import { Injectable } from '@nestjs/common';
import type { FulfillmentCommandPayload } from '../../../../../common/contracts/messages';
import { ROUTING_KEYS } from '../../../../../common/contracts/routing-keys';
import { FulfillmentAttemptRunner } from '../../../app/fulfillment-attempt';

import { DigitalGrants } from '../ports/digital.port';

@Injectable()
export class GrantDigitalUC {
  constructor(
    private readonly runner: FulfillmentAttemptRunner,
    private readonly grants: DigitalGrants,
  ) {}

  execute({
    orderId,
    attemptNo,
    ...grant
  }: FulfillmentCommandPayload): Promise<void> {
    return this.runner.run(
      { orderId, attemptNo, orderItemId: grant.orderItemId },
      {
        started: ROUTING_KEYS.DigitalStarted,
        succeeded: ROUTING_KEYS.DigitalSucceeded,
        failed: ROUTING_KEYS.DigitalFailed,
      },
      async (tx) => {
        const { orderItemId, productId, customerId, quantity } = grant;
        await this.grants.grant(
          { orderItemId, productId, customerId, quantity },
          tx,
        );
        return {};
      },
    );
  }
}
