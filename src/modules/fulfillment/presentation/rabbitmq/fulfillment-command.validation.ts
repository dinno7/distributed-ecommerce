import { isUUID } from 'class-validator';
import type {
  FulfillmentCommandPayload,
  FulfillmentItemMessage,
} from '../../../../common/contracts/messages';
import { NonRetryableError } from '../../../../common/messaging/infra/retrier-error-handler';

import { isPositiveInt32 } from '../../../../common/utils/positive-int32';

function validateFulfillmentItem(payload: FulfillmentItemMessage): void {
  if (
    !isUUID(payload?.orderId) ||
    !isUUID(payload.orderItemId) ||
    !isPositiveInt32(payload.attemptNo)
  ) {
    throw new NonRetryableError('Invalid fulfillment item identity');
  }
}

export function validateFulfillmentCommand(
  payload: FulfillmentCommandPayload,
): void {
  validateFulfillmentItem(payload);
  if (
    !isUUID(payload.customerId) ||
    !isUUID(payload.productId) ||
    !isPositiveInt32(payload.quantity)
  ) {
    throw new NonRetryableError('Invalid fulfillment command');
  }
}
