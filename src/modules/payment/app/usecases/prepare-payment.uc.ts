import { Injectable } from '@nestjs/common';
import type { UseCase } from '../../../../common/ports/usecase.port';
import { TransactionManager } from '../../../../common/ports/transaction.port';
import type { Money } from '../../../../common/value-objects/money';
import { Payment } from '../../domain/payment.entity';
import { PaymentCheckoutService } from '../payment-checkout.service';
import { PaymentGatewayRegistry } from '../payment-gateway.registry';
import { PaymentRepository } from '../ports/payment.repository';

export interface PreparePaymentInput {
  orderId: string;
  amount: Money;
  gatewayName: string;
}

@Injectable()
export class PreparePaymentUC implements UseCase<PreparePaymentInput, Payment> {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly txManager: TransactionManager,
    private readonly gateways: PaymentGatewayRegistry,
    private readonly checkoutService: PaymentCheckoutService,
  ) {}

  async execute({
    orderId,
    amount,
    gatewayName,
  }: PreparePaymentInput): Promise<Payment> {
    this.gateways.get(gatewayName);

    const payment = await this.txManager.run(async (tx) => {
      const initial = Payment.create(orderId, amount, gatewayName);
      if (await this.paymentRepo.create(initial, tx)) return initial;

      const existing = await this.paymentRepo.findByOrderIdAndAttempt(
        orderId,
        initial.attempt,
        tx,
      );
      if (!existing) throw new Error('Existing payment attempt disappeared');
      return existing;
    });

    return this.checkoutService.prepare(payment);
  }
}
