import { QUEUES } from './queues';

export const enum ROUTING_KEYS {
  OrderCreated = 'evt.order.created',
  OrderRetryScheduled = 'evt.order.retry_scheduled',
  OrderCompleted = 'evt.order.completed',
  OrderPartiallyFailed = 'evt.order.partially_failed',
  OrderFailed = 'evt.order.failed',
  PaymentStarted = 'evt.payment.started',
  PaymentSucceeded = 'evt.payment.succeeded',
  PaymentFailed = 'evt.payment.failed',
  PaymentTimedOut = 'evt.payment.timed_out',
  DigitalStarted = 'evt.digital.started',
  DigitalSucceeded = 'evt.digital.succeeded',
  DigitalFailed = 'evt.digital.failed',
  SubscriptionStarted = 'evt.subscription.started',
  SubscriptionSucceeded = 'evt.subscription.succeeded',
  SubscriptionFailed = 'evt.subscription.failed',
  PhysicalStarted = 'evt.physical.started',
  PhysicalShipmentCreated = 'evt.physical.shipment_created',
  PhysicalSucceeded = 'evt.physical.succeeded',
  PhysicalFailed = 'evt.physical.failed',
  ChargePayment = 'cmd.payment.charge',
  GrantDigital = 'cmd.digital.grant',
  ActivateSubscription = 'cmd.subscription.activate',
  FulfillPhysical = 'cmd.physical.fulfill',

  PaymentProcessDlq = `${QUEUES.PaymentProcess}.dlq`,
}
