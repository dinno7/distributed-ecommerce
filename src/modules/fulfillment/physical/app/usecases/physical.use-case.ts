import { Injectable } from '@nestjs/common';
import type { FulfillmentCommandPayload } from '../../../../../common/contracts/messages';
import { ROUTING_KEYS } from '../../../../../common/contracts/routing-keys';
import { EventMessage } from '../../../../../common/domain/value-objects/event-message.vo';
import { FulfillmentAttemptRunner } from '../../../app/fulfillment-attempt';
import { PhysicalFulfillment } from '../ports/physical.port';
import { PhysicalStockReservation } from '../ports/stock-reservation.port';

@Injectable()
export class FulfillPhysicalUC {
  constructor(
    private readonly runner: FulfillmentAttemptRunner,
    private readonly physical: PhysicalFulfillment,
    private readonly inventory: PhysicalStockReservation,
  ) {}

  execute({
    orderId,
    orderItemId,
    attemptNo,
    productId,
    quantity,
  }: FulfillmentCommandPayload): Promise<void> {
    const item = { orderId, orderItemId, attemptNo };
    return this.runner.run(
      item,
      {
        started: ROUTING_KEYS.PhysicalStarted,
        succeeded: ROUTING_KEYS.PhysicalSucceeded,
        failed: ROUTING_KEYS.PhysicalFailed,
      },
      async (tx) => {
        const result = await this.inventory.reserve(productId, quantity, tx);
        if (result !== 'RESERVED') return { errorCode: result };
        const shipmentId = await this.physical.ship(orderItemId, quantity, tx);
        return {
          events: [
            new EventMessage(
              { ...item, shipmentId },
              ROUTING_KEYS.PhysicalShipmentCreated,
            ),
          ],
        };
      },
    );
  }
}
