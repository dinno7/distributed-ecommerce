import { EventMessage } from '../domain/value-objects/event-message.vo';
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
  attemptNo: number;
  providerRef?: string;
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
  attemptNo: number;
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

export interface FulfillmentItemMessage {
  orderId: string;
  orderItemId: string;
  attemptNo: number;
}

export interface FulfillmentCommandPayload extends FulfillmentItemMessage {
  customerId: string;
  productId: string;
  quantity: number;
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

export class GrantDigitalCommand extends EventMessage<FulfillmentCommandPayload> {
  static readonly ROUTING_KEY = ROUTING_KEYS.GrantDigital;
  constructor(payload: FulfillmentCommandPayload) {
    super(payload, GrantDigitalCommand.ROUTING_KEY);
  }
}

export interface ActivateSubscriptionCommandPayload extends FulfillmentCommandPayload {
  durationDays: number | null;
}

export class ActivateSubscriptionCommand extends EventMessage<ActivateSubscriptionCommandPayload> {
  static readonly ROUTING_KEY = ROUTING_KEYS.ActivateSubscription;
  constructor(payload: ActivateSubscriptionCommandPayload) {
    super(payload, ActivateSubscriptionCommand.ROUTING_KEY);
  }
}

export class FulfillPhysicalCommand extends EventMessage<FulfillmentCommandPayload> {
  static readonly ROUTING_KEY = ROUTING_KEYS.FulfillPhysical;
  constructor(payload: FulfillmentCommandPayload) {
    super(payload, FulfillPhysicalCommand.ROUTING_KEY);
  }
}
