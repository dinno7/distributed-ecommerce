import type { Payment, PaymentOutcome } from '../../domain/payment.entity';

export abstract class PaymentGateway {
  // Repeated calls with the same payment ID must recover the same checkout.
  abstract createCheckout(
    payment: Pick<Payment, 'id' | 'orderId' | 'amount'>,
  ): Promise<{ checkoutUrl: string }>;

  abstract resolveCallback(
    payment: Pick<Payment, 'id' | 'amount'>,
    payload: unknown,
  ): Promise<PaymentOutcome>;
}
