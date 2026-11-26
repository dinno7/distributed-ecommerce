import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionManager } from '../../../../common/ports/transaction.port';
import type { UseCase } from '../../../../common/ports/usecase.port';
import {
  type Payment,
  PaymentRetryNotEligibleError,
  PaymentStatus,
} from '../../domain/payment.entity';
import { PaymentCheckoutService } from '../payment-checkout.service';
import { PaymentRepository } from '../ports/payment.repository';

@Injectable()
export class RetryPaymentUC implements UseCase<string, Payment> {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly txManager: TransactionManager,
    private readonly checkout: PaymentCheckoutService,
  ) {}

  async execute(failedPaymentId: string): Promise<Payment> {
    const payment = await this.txManager.run(async (tx) => {
      const failed = await this.paymentRepo.findByIdForUpdate(
        failedPaymentId,
        tx,
      );
      if (!failed) throw new NotFoundException('Payment not found');
      if (failed.status !== PaymentStatus.FAILED)
        throw new PaymentRetryNotEligibleError();

      const existing = await this.paymentRepo.findByOrderIdAndAttempt(
        failed.orderId,
        failed.attempt + 1,
        tx,
      );
      if (existing) return existing;

      const next = failed.retry();
      if (!(await this.paymentRepo.create(next, tx)))
        throw new Error('Retry attempt already exists');
      return next;
    });

    return this.checkout.prepare(payment);
  }
}
