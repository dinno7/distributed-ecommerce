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
  static ROUTING_KEY: string = ROUTING_KEYS.OrderCreated;

  constructor(payload: OrderCreatedEventPayload) {
    super(payload, OrderCreatedEvent.ROUTING_KEY);
  }
}

export interface OrderRetryScheduledEventPayload {
  orderId: string;
  orderItemId?: string;
  reason: string;
  attemptNo: number;
}

export class OrderRetryScheduledEvent extends EventMessage<OrderRetryScheduledEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.OrderRetryScheduled;

  constructor(payload: OrderRetryScheduledEventPayload) {
    super(payload, OrderRetryScheduledEvent.ROUTING_KEY);
  }
}

export interface OrderCompletedEventPayload {
  orderId: string;
  completedAt: string;
}

export class OrderCompletedEvent extends EventMessage<OrderCompletedEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.OrderCompleted;

  constructor(payload: OrderCompletedEventPayload) {
    super(payload, OrderCompletedEvent.ROUTING_KEY);
  }
}

export interface OrderPartiallyFailedEventPayload {
  orderId: string;
  failedItemIds: string[];
  completedItemIds: string[];
}

export class OrderPartiallyFailedEvent extends EventMessage<OrderPartiallyFailedEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.OrderPartiallyFailed;

  constructor(payload: OrderPartiallyFailedEventPayload) {
    super(payload, OrderPartiallyFailedEvent.ROUTING_KEY);
  }
}

export interface OrderFailedEventPayload {
  orderId: string;
  reason: string;
}

export class OrderFailedEvent extends EventMessage<OrderFailedEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.OrderFailed;

  constructor(payload: OrderFailedEventPayload) {
    super(payload, OrderFailedEvent.ROUTING_KEY);
  }
}

export interface PaymentStartedEventPayload {
  orderId: string;
  paymentId: string;
  attemptNo: number;
}

export class PaymentStartedEvent extends EventMessage<PaymentStartedEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.PaymentStarted;

  constructor(payload: PaymentStartedEventPayload) {
    super(payload, PaymentStartedEvent.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.PaymentSucceeded;

  constructor(payload: PaymentSucceededEventPayload) {
    super(payload, PaymentSucceededEvent.ROUTING_KEY);
  }
}

export interface PaymentFailedEventPayload {
  orderId: string;
  paymentId: string;
  errorCode: string;
  reason: string;
}

export class PaymentFailedEvent extends EventMessage<PaymentFailedEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.PaymentFailed;

  constructor(payload: PaymentFailedEventPayload) {
    super(payload, PaymentFailedEvent.ROUTING_KEY);
  }
}

export interface PaymentTimedOutEventPayload {
  orderId: string;
  paymentId: string;
  attemptNo: number;
  retryable: boolean;
}

export class PaymentTimedOutEvent extends EventMessage<PaymentTimedOutEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.PaymentTimedOut;

  constructor(payload: PaymentTimedOutEventPayload) {
    super(payload, PaymentTimedOutEvent.ROUTING_KEY);
  }
}

export interface DigitalStartedEventPayload {
  orderId: string;
  orderItemId: string;
}

export class DigitalStartedEvent extends EventMessage<DigitalStartedEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.DigitalStarted;

  constructor(payload: DigitalStartedEventPayload) {
    super(payload, DigitalStartedEvent.ROUTING_KEY);
  }
}

export interface DigitalSucceededEventPayload {
  orderId: string;
  orderItemId: string;
  entitlementId: string;
  accessKey: string;
}

export class DigitalSucceededEvent extends EventMessage<DigitalSucceededEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.DigitalSucceeded;

  constructor(payload: DigitalSucceededEventPayload) {
    super(payload, DigitalSucceededEvent.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.DigitalFailed;

  constructor(payload: DigitalFailedEventPayload) {
    super(payload, DigitalFailedEvent.ROUTING_KEY);
  }
}

export interface SubscriptionStartedEventPayload {
  orderId: string;
  orderItemId: string;
}

export class SubscriptionStartedEvent extends EventMessage<SubscriptionStartedEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.SubscriptionStarted;

  constructor(payload: SubscriptionStartedEventPayload) {
    super(payload, SubscriptionStartedEvent.ROUTING_KEY);
  }
}

export interface SubscriptionSucceededEventPayload {
  orderId: string;
  orderItemId: string;
  subscriptionId: string;
  expiresAt: string;
}

export class SubscriptionSucceededEvent extends EventMessage<SubscriptionSucceededEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.SubscriptionSucceeded;

  constructor(payload: SubscriptionSucceededEventPayload) {
    super(payload, SubscriptionSucceededEvent.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.SubscriptionFailed;

  constructor(payload: SubscriptionFailedEventPayload) {
    super(payload, SubscriptionFailedEvent.ROUTING_KEY);
  }
}

export interface PhysicalStartedEventPayload {
  orderId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
}

export class PhysicalStartedEvent extends EventMessage<PhysicalStartedEventPayload> {
  static ROUTING_KEY: string = ROUTING_KEYS.PhysicalStarted;

  constructor(payload: PhysicalStartedEventPayload) {
    super(payload, PhysicalStartedEvent.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.PhysicalShipmentCreated;

  constructor(payload: PhysicalShipmentCreatedEventPayload) {
    super(payload, PhysicalShipmentCreatedEvent.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.PhysicalSucceeded;

  constructor(payload: PhysicalSucceededEventPayload) {
    super(payload, PhysicalSucceededEvent.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.PhysicalFailed;

  constructor(payload: PhysicalFailedEventPayload) {
    super(payload, PhysicalFailedEvent.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.ChargePayment;

  constructor(payload: ChargePaymentCommandPayload) {
    super(payload, ChargePaymentCommand.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.GrantDigital;

  constructor(payload: GrantDigitalCommandPayload) {
    super(payload, GrantDigitalCommand.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.ActivateSubscription;

  constructor(payload: ActivateSubscriptionCommandPayload) {
    super(payload, ActivateSubscriptionCommand.ROUTING_KEY);
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
  static ROUTING_KEY: string = ROUTING_KEYS.FulfillPhysical;

  constructor(payload: FulfillPhysicalCommandPayload) {
    super(payload, FulfillPhysicalCommand.ROUTING_KEY);
  }
}
