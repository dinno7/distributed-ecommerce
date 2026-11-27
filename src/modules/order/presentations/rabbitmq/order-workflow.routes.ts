import { ROUTING_KEYS } from '../../../../common/contracts/routing-keys';

export const orderPaymentQueue = {
  name: 'q.orders.payment',
  routingKey: [
    ROUTING_KEYS.PaymentStarted,
    ROUTING_KEYS.PaymentSucceeded,
    ROUTING_KEYS.PaymentFailed,
  ],
};

export const fulfillmentResultTypes = {
  [ROUTING_KEYS.DigitalSucceeded]: 'DIGITAL',
  [ROUTING_KEYS.DigitalFailed]: 'DIGITAL',
  [ROUTING_KEYS.SubscriptionSucceeded]: 'SUBSCRIPTION',
  [ROUTING_KEYS.SubscriptionFailed]: 'SUBSCRIPTION',
  [ROUTING_KEYS.PhysicalSucceeded]: 'PHYSICAL',
  [ROUTING_KEYS.PhysicalFailed]: 'PHYSICAL',
} as const;

export const orderFulfillmentQueue = {
  name: 'q.orders.fulfillment',
  routingKey: Object.keys(fulfillmentResultTypes),
};
