import { Injectable, NotFoundException } from '@nestjs/common';
import type { UseCase } from '../../../../common/ports/usecase.port';
import type { Payment } from '../../domain/payment.entity';
import { PaymentRepository } from '../ports/payment.repository';

@Injectable()
export class GetPaymentUC implements UseCase<string, Payment> {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  async execute(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
