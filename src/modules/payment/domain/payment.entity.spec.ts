import { Money } from '../../../common/value-objects/money';
import {
  Payment,
  PaymentAlreadyFinalError,
  PaymentFailureCode,
  PaymentRetryNotEligibleError,
  PaymentStatus,
} from './payment.entity';

describe('Payment', () => {
  const amount = new Money(2_499n);
  const success = { status: PaymentStatus.SUCCEEDED, failureCode: null };

  it('starts at attempt one and accepts the same success only once', () => {
    const payment = Payment.create('order', amount);

    expect(payment).toMatchObject({
      orderId: 'order',
      attempt: 1,
      amount,
      status: PaymentStatus.AWAITING_CUSTOMER,
      failureCode: null,
    });
    expect(() => payment.retry()).toThrow(PaymentRetryNotEligibleError);
    expect(payment.settle(success)).toBe(true);
    expect(payment.settle(success)).toBe(false);
    expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
    expect(() => payment.retry()).toThrow(PaymentRetryNotEligibleError);
  });

  it('replays a stored failure and rejects a conflicting outcome', () => {
    const payment = new Payment('payment', 'order', 1, amount, {
      status: PaymentStatus.FAILED,
      failureCode: PaymentFailureCode.PAYMENT_DECLINED,
    });

    expect(
      payment.settle({
        status: PaymentStatus.FAILED,
        failureCode: PaymentFailureCode.PAYMENT_DECLINED,
      }),
    ).toBe(false);
    expect(() =>
      payment.settle({
        status: PaymentStatus.FAILED,
        failureCode: PaymentFailureCode.PAYMENT_TIMED_OUT,
      }),
    ).toThrow(PaymentAlreadyFinalError);
    expect(() => payment.settle(success)).toThrow(PaymentAlreadyFinalError);
    expect(payment.failureCode).toBe(PaymentFailureCode.PAYMENT_DECLINED);
  });

  it('creates a fresh checkout for the same order and amount after failure', () => {
    const payment = Payment.create('order', amount);
    const timeout = PaymentFailureCode.PAYMENT_TIMED_OUT;

    expect(
      payment.settle({ status: PaymentStatus.FAILED, failureCode: timeout }),
    ).toBe(true);

    const retry = payment.retry();

    expect(retry.id).not.toBe(payment.id);
    expect(retry).toMatchObject({
      orderId: payment.orderId,
      attempt: 2,
      amount,
      status: PaymentStatus.AWAITING_CUSTOMER,
      failureCode: null,
    });
    expect(payment.status).toBe(PaymentStatus.FAILED);
    expect(payment.failureCode).toBe(timeout);
  });

  it.each([0, 1.5, 2_147_483_648])('rejects attempt number %s', (attempt) => {
    expect(
      () => new Payment('payment', 'order', attempt, amount, success),
    ).toThrow(RangeError);
  });
});
