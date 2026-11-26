import { randomUUIDv7 } from 'node:crypto';
import type { Money } from '../../../common/value-objects/money';

export const PaymentStatus = {
  AWAITING_CUSTOMER: 'AWAITING_CUSTOMER',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentFailureCode = {
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  PAYMENT_TIMED_OUT: 'PAYMENT_TIMED_OUT',
} as const;

export type PaymentFailureCode =
  (typeof PaymentFailureCode)[keyof typeof PaymentFailureCode];

type PaymentOutcome =
  | { status: typeof PaymentStatus.SUCCEEDED; failureCode: null }
  | { status: typeof PaymentStatus.FAILED; failureCode: PaymentFailureCode };

type PaymentState =
  | { status: typeof PaymentStatus.AWAITING_CUSTOMER; failureCode: null }
  | PaymentOutcome;

export class PaymentAlreadyFinalError extends Error {
  constructor() {
    super('Payment already has a different outcome');
  }
}

export class PaymentRetryNotEligibleError extends Error {
  constructor() {
    super('Only failed payments can be retried');
  }
}

export class Payment {
  #state: PaymentState;

  constructor(
    readonly id: string,
    readonly orderId: string,
    readonly attempt: number,
    readonly amount: Money,
    state: PaymentState,
  ) {
    if (!Number.isInteger(attempt) || attempt < 1 || attempt > 2_147_483_647) {
      throw new RangeError('Payment attempt must be a positive 32-bit integer');
    }

    this.#state = { ...state };
  }

  get status(): PaymentStatus {
    return this.#state.status;
  }

  get failureCode(): PaymentFailureCode | null {
    return this.#state.failureCode;
  }

  static create(orderId: string, amount: Money): Payment {
    return new Payment(randomUUIDv7(), orderId, 1, amount, {
      status: PaymentStatus.AWAITING_CUSTOMER,
      failureCode: null,
    });
  }

  settle(outcome: PaymentOutcome): boolean {
    if (this.status === PaymentStatus.AWAITING_CUSTOMER) {
      this.#state = { ...outcome };
      return true;
    }

    if (
      this.status === outcome.status &&
      this.failureCode === outcome.failureCode
    ) {
      return false;
    }

    throw new PaymentAlreadyFinalError();
  }

  retry(): Payment {
    if (this.status !== PaymentStatus.FAILED) {
      throw new PaymentRetryNotEligibleError();
    }

    return new Payment(
      randomUUIDv7(),
      this.orderId,
      this.attempt + 1,
      this.amount,
      {
        status: PaymentStatus.AWAITING_CUSTOMER,
        failureCode: null,
      },
    );
  }
}
