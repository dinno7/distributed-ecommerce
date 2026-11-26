import type { Payment, PaymentOutcome } from '../../domain/payment.entity';

export abstract class PaymentGateway {
  abstract createCheckout(
    payment: Pick<Payment, 'id' | 'orderId' | 'amount'>,
  ): Promise<{ checkoutUrl: string }>;

  abstract resolveCallback(
    payment: Pick<Payment, 'id' | 'amount'>,
    payload: unknown,
  ): Promise<PaymentOutcome>;
}
