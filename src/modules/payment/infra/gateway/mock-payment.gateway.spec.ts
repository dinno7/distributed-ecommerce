import { ConfigService } from '@nestjs/config';
import { Money } from '../../../../common/value-objects/money';
import type { PaymentGateway } from '../../app/ports/payment-gateway.port';
import {
  Payment,
  PaymentFailureCode,
  PaymentStatus,
} from '../../domain/payment.entity';
import {
  InvalidMockPaymentCallbackError,
  MockPaymentGateway,
} from './mock-payment.gateway';

describe('MockPaymentGateway', () => {
  const gateway: PaymentGateway = new MockPaymentGateway(
    new ConfigService({ app: { port: 4321 } }),
  );
  const payment = Payment.create('order', new Money(2_499n));

  it('returns a stable checkout URL for an attempt', async () => {
    const checkout = {
      checkoutUrl: `http://localhost:4321/mock-payments/${payment.id}`,
    };
    await expect(gateway.createCheckout(payment)).resolves.toEqual(checkout);
    await expect(gateway.createCheckout(payment)).resolves.toEqual(checkout);
  });

  it.each([
    ['SUCCESS', PaymentStatus.SUCCEEDED, null],
    ['DECLINE', PaymentStatus.FAILED, PaymentFailureCode.PAYMENT_DECLINED],
    ['TIMEOUT', PaymentStatus.FAILED, PaymentFailureCode.PAYMENT_TIMED_OUT],
  ])('maps %s to a payment outcome', async (result, status, failureCode) => {
    await expect(gateway.resolveCallback(payment, { result })).resolves.toEqual(
      {
        status,
        failureCode,
      },
    );
    expect(payment.status).toBe(PaymentStatus.AWAITING_CUSTOMER);
  });

  it.each([undefined, null, 'SUCCESS', {}, { result: 'UNKNOWN' }])(
    'rejects invalid callback payload %p',
    async (payload) => {
      await expect(gateway.resolveCallback(payment, payload)).rejects.toThrow(
        InvalidMockPaymentCallbackError,
      );
    },
  );
});
