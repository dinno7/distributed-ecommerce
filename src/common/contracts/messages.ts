import { EventMessage } from '../types/event-message';
import { ROUTING_KEYS } from './routing-keys';

export interface OrderCreatedEventPayload {
  orderId: string;
  customerId: string;
  totalMinor: string;
  currency: string;
  itemCount: number;
}

export class OrderCreatedEvent extends EventMessage<OrderCreatedEventPayload> {
  constructor(payload: OrderCreatedEventPayload) {
    super(payload, ROUTING_KEYS.OrderCreated);
  }
}

export interface OrderRetryScheduledEventPayload {
  orderId: string;
  orderItemId?: string;
  reason: string;
  attemptNo: number;
}

export class OrderRetryScheduledEvent extends EventMessage<OrderRetryScheduledEventPayload> {
  constructor(payload: OrderRetryScheduledEventPayload) {
    super(payload, ROUTING_KEYS.OrderRetryScheduled);
  }
}

export interface OrderCompletedEventPayload {
  orderId: string;
  completedAt: string;
}

export class OrderCompletedEvent extends EventMessage<OrderCompletedEventPayload> {
  constructor(payload: OrderCompletedEventPayload) {
    super(payload, ROUTING_KEYS.OrderCompleted);
  }
}

export interface OrderPartiallyFailedEventPayload {
  orderId: string;
  failedItemIds: string[];
  completedItemIds: string[];
}

export class OrderPartiallyFailedEvent extends EventMessage<OrderPartiallyFailedEventPayload> {
  constructor(payload: OrderPartiallyFailedEventPayload) {
    super(payload, ROUTING_KEYS.OrderPartiallyFailed);
  }
}

export interface OrderFailedEventPayload {
  orderId: string;
  reason: string;
}

export class OrderFailedEvent extends EventMessage<OrderFailedEventPayload> {
  constructor(payload: OrderFailedEventPayload) {
    super(payload, ROUTING_KEYS.OrderFailed);
  }
}

export interface PaymentStartedEventPayload {
  orderId: string;
  paymentId: string;
  attemptNo: number;
}

export class PaymentStartedEvent extends EventMessage<PaymentStartedEventPayload> {
  constructor(payload: PaymentStartedEventPayload) {
    super(payload, ROUTING_KEYS.PaymentStarted);
  }
}

export interface PaymentSucceededEventPayload {
  orderId: string;
  paymentId: string;
  providerRef: string;
  amountMinor: string;
  currency: string;
}

export class PaymentSucceededEvent extends EventMessage<PaymentSucceededEventPayload> {
  constructor(payload: PaymentSucceededEventPayload) {
    super(payload, ROUTING_KEYS.PaymentSucceeded);
  }
}

export interface PaymentFailedEventPayload {
  orderId: string;
  paymentId: string;
  errorCode: string;
  reason: string;
}

export class PaymentFailedEvent extends EventMessage<PaymentFailedEventPayload> {
  constructor(payload: PaymentFailedEventPayload) {
    super(payload, ROUTING_KEYS.PaymentFailed);
  }
}

export interface PaymentTimedOutEventPayload {
  orderId: string;
  paymentId: string;
  attemptNo: number;
  retryable: boolean;
}

export class PaymentTimedOutEvent extends EventMessage<PaymentTimedOutEventPayload> {
  constructor(payload: PaymentTimedOutEventPayload) {
    super(payload, ROUTING_KEYS.PaymentTimedOut);
  }
}

export interface DigitalStartedEventPayload {
  orderId: string;
  orderItemId: string;
}

export class DigitalStartedEvent extends EventMessage<DigitalStartedEventPayload> {
  constructor(payload: DigitalStartedEventPayload) {
    super(payload, ROUTING_KEYS.DigitalStarted);
  }
}

export interface DigitalSucceededEventPayload {
  orderId: string;
  orderItemId: string;
  entitlementId: string;
  accessKey: string;
}

export class DigitalSucceededEvent extends EventMessage<DigitalSucceededEventPayload> {
  constructor(payload: DigitalSucceededEventPayload) {
    super(payload, ROUTING_KEYS.DigitalSucceeded);
  }
}

export interface DigitalFailedEventPayload {
  orderId: string;
  orderItemId: string;
  errorCode: string;
  reason: string;
  retryable: boolean;
}

export class DigitalFailedEvent extends EventMessage<DigitalFailedEventPayload> {
  constructor(payload: DigitalFailedEventPayload) {
    super(payload, ROUTING_KEYS.DigitalFailed);
  }
}

export interface SubscriptionStartedEventPayload {
  orderId: string;
  orderItemId: string;
}

export class SubscriptionStartedEvent extends EventMessage<SubscriptionStartedEventPayload> {
  constructor(payload: SubscriptionStartedEventPayload) {
    super(payload, ROUTING_KEYS.SubscriptionStarted);
  }
}

export interface SubscriptionSucceededEventPayload {
  orderId: string;
  orderItemId: string;
  subscriptionId: string;
  expiresAt: string;
}

export class SubscriptionSucceededEvent extends EventMessage<SubscriptionSucceededEventPayload> {
  constructor(payload: SubscriptionSucceededEventPayload) {
    super(payload, ROUTING_KEYS.SubscriptionSucceeded);
  }
}

export interface SubscriptionFailedEventPayload {
  orderId: string;
  orderItemId: string;
  errorCode: string;
  reason: string;
  retryable: boolean;
}

export class SubscriptionFailedEvent extends EventMessage<SubscriptionFailedEventPayload> {
  constructor(payload: SubscriptionFailedEventPayload) {
    super(payload, ROUTING_KEYS.SubscriptionFailed);
  }
}

export interface PhysicalStartedEventPayload {
  orderId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
}

export class PhysicalStartedEvent extends EventMessage<PhysicalStartedEventPayload> {
  constructor(payload: PhysicalStartedEventPayload) {
    super(payload, ROUTING_KEYS.PhysicalStarted);
  }
}

export interface PhysicalShipmentCreatedEventPayload {
  orderId: string;
  orderItemId: string;
  shipmentId: string;
  trackingNumber: string;
  carrier: string;
}

export class PhysicalShipmentCreatedEvent extends EventMessage<PhysicalShipmentCreatedEventPayload> {
  constructor(payload: PhysicalShipmentCreatedEventPayload) {
    super(payload, ROUTING_KEYS.PhysicalShipmentCreated);
  }
}

export interface PhysicalSucceededEventPayload {
  orderId: string;
  orderItemId: string;
  reservationId: string;
  shipmentId: string;
  trackingNumber: string;
}

export class PhysicalSucceededEvent extends EventMessage<PhysicalSucceededEventPayload> {
  constructor(payload: PhysicalSucceededEventPayload) {
    super(payload, ROUTING_KEYS.PhysicalSucceeded);
  }
}

export interface PhysicalFailedEventPayload {
  orderId: string;
  orderItemId: string;
  errorCode: string;
  reason: string;
  retryable: boolean;
}

export class PhysicalFailedEvent extends EventMessage<PhysicalFailedEventPayload> {
  constructor(payload: PhysicalFailedEventPayload) {
    super(payload, ROUTING_KEYS.PhysicalFailed);
  }
}

export interface ChargePaymentCommandPayload {
  orderId: string;
  customerId: string;
  amountMinor: string;
  currency: string;
  paymentReference?: string;
}

export class ChargePaymentCommand extends EventMessage<ChargePaymentCommandPayload> {
  constructor(payload: ChargePaymentCommandPayload) {
    super(payload, ROUTING_KEYS.ChargePayment);
  }
}

export interface GrantDigitalCommandPayload {
  orderId: string;
  orderItemId: string;
  customerId: string;
  productId: string;
  quantity: number;
  metadata: Record<string, unknown>;
}

export class GrantDigitalCommand extends EventMessage<GrantDigitalCommandPayload> {
  constructor(payload: GrantDigitalCommandPayload) {
    super(payload, ROUTING_KEYS.GrantDigital);
  }
}

export interface ActivateSubscriptionCommandPayload {
  orderId: string;
  orderItemId: string;
  customerId: string;
  productId: string;
  quantity: number;
  durationDays: number;
}

export class ActivateSubscriptionCommand extends EventMessage<ActivateSubscriptionCommandPayload> {
  constructor(payload: ActivateSubscriptionCommandPayload) {
    super(payload, ROUTING_KEYS.ActivateSubscription);
  }
}

export interface FulfillPhysicalCommandPayload {
  orderId: string;
  orderItemId: string;
  customerId: string;
  productId: string;
  quantity: number;
  shippingAddress?: Record<string, unknown>;
}

export class FulfillPhysicalCommand extends EventMessage<FulfillPhysicalCommandPayload> {
  constructor(payload: FulfillPhysicalCommandPayload) {
    super(payload, ROUTING_KEYS.FulfillPhysical);
  }
}
