import {
  ActivateSubscriptionCommand,
  FulfillPhysicalCommand,
  GrantDigitalCommand,
} from '../../../common/contracts/messages';
import type { Order } from '../domain/order.entity';
import type { OrderItem } from '../domain/order-item.entity';

export function fulfillmentCommand(
  order: Order,
  item: OrderItem,
  attemptNo: number,
) {
  const payload = {
    orderId: order.id,
    orderItemId: item.id,
    attemptNo,
    customerId: order.customerId,
    productId: item.productId,
    quantity: item.quantity,
  };
  switch (item.productType) {
    case 'DIGITAL':
      return new GrantDigitalCommand(payload);
    case 'SUBSCRIPTION':
      return new ActivateSubscriptionCommand({
        ...payload,
        durationDays: item.subscriptionDays ?? null,
      });
    case 'PHYSICAL':
      return new FulfillPhysicalCommand(payload);
  }
}
