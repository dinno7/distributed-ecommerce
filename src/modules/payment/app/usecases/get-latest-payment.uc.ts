import { Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../common/ports/usecase.port';
import {
  type PaymentFailureCode,
  PaymentStatus,
} from '../../domain/payment.entity';
import { PaymentRepository } from '../ports/payment.repository';

export interface LatestPayment {
  paymentId: string | null;
  status: PaymentStatus | 'PENDING';
  checkoutUrl: string | null;
  amountMinor: bigint;
  currency: string;
  failureCode?: PaymentFailureCode;
}

@Injectable()
export class GetLatestPaymentUC implements UseCase<
  string,
  LatestPayment | null
> {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  async execute(orderId: string): Promise<LatestPayment | null> {
    const payment = await this.paymentRepo.findLatestByOrderId(orderId);
    if (!payment) return null;
    const checkoutPending =
      payment.status === PaymentStatus.AWAITING_CUSTOMER &&
      payment.checkoutUrl === null;
    return {
      paymentId: checkoutPending && payment.attempt === 1 ? null : payment.id,
      status: checkoutPending ? 'PENDING' : payment.status,
      checkoutUrl: payment.checkoutUrl,
      amountMinor: payment.amount.minorUnits,
      currency: payment.amount.currency,
      failureCode: payment.failureCode ?? undefined,
    };
  }
}
