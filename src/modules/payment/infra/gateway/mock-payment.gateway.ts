import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PaymentGateway } from '../../app/ports/payment-gateway.port';
import {
  type Payment,
  PaymentFailureCode,
  type PaymentOutcome,
  PaymentStatus,
} from '../../domain/payment.entity';

export class InvalidMockPaymentCallbackError extends Error {
  constructor() {
    super('Payment callback result must be SUCCESS, DECLINE, or TIMEOUT');
  }
}

@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  constructor(private readonly config: ConfigService) {}

  async createCheckout({ id }: Pick<Payment, 'id'>): Promise<{
    checkoutUrl: string;
  }> {
    const port = this.config.getOrThrow<number>('app.port');
    return {
      checkoutUrl: `http://localhost:${port}/mock-payments/${encodeURIComponent(id)}`,
    };
  }

  async resolveCallback(
    _payment: Pick<Payment, 'id' | 'amount'>,
    payload: unknown,
  ): Promise<PaymentOutcome> {
    const result =
      payload && typeof payload === 'object' && 'result' in payload
        ? payload.result
        : undefined;

    switch (result) {
      case 'SUCCESS':
        return { status: PaymentStatus.SUCCEEDED, failureCode: null };
      case 'DECLINE':
        return {
          status: PaymentStatus.FAILED,
          failureCode: PaymentFailureCode.PAYMENT_DECLINED,
        };
      case 'TIMEOUT':
        return {
          status: PaymentStatus.FAILED,
          failureCode: PaymentFailureCode.PAYMENT_TIMED_OUT,
        };
      default:
        throw new InvalidMockPaymentCallbackError();
    }
  }
}
