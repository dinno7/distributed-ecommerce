import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentFailedEvent,
  PaymentSucceededEvent,
} from '../../../../common/contracts/messages';
import { TransactionManager } from '../../../../common/ports/transaction.port';
import type { UseCase } from '../../../../common/ports/usecase.port';
import {
  type Payment,
  PaymentFailureCode,
  PaymentStatus,
} from '../../domain/payment.entity';
import { PaymentGatewayRegistry } from '../payment-gateway.registry';
import { PaymentOutboxRepository } from '../ports/payment-outbox.repository';
import { PaymentRepository } from '../ports/payment.repository';

export interface SettlePaymentInput {
  paymentId: string;
  gatewayName: string;
  payload: unknown;
}

@Injectable()
export class SettlePaymentUC implements UseCase<SettlePaymentInput, Payment> {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly txManager: TransactionManager,
    private readonly gateways: PaymentGatewayRegistry,
    private readonly outbox: PaymentOutboxRepository,
  ) {}

  async execute({
    paymentId,
    gatewayName,
    payload,
  }: SettlePaymentInput): Promise<Payment> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment || payment.gatewayName !== gatewayName) {
      throw new NotFoundException('Payment not found');
    }
    const outcome = await this.gateways
      .get(payment.gatewayName)
      .resolveCallback(payment, payload);

    return this.txManager.run(async (tx) => {
      const current = await this.paymentRepo.findByIdForUpdate(payment.id, tx);
      if (!current) throw new NotFoundException('Payment not found');
      if (
        current.status === PaymentStatus.AWAITING_CUSTOMER &&
        current.checkoutUrl === null
      ) {
        throw new ConflictException('Payment checkout is being prepared');
      }
      if (!current.settle(outcome)) return current;

      await this.paymentRepo.update(current, tx);
      const identity = {
        orderId: current.orderId,
        paymentId: current.id,
        attemptNo: current.attempt,
      };
      const event =
        outcome.status === PaymentStatus.SUCCEEDED
          ? new PaymentSucceededEvent({
              ...identity,
              amountMinor: current.amount.minorUnits.toString(),
              currency: current.amount.currency,
            })
          : new PaymentFailedEvent({
              ...identity,
              errorCode: outcome.failureCode,
              reason:
                outcome.failureCode === PaymentFailureCode.PAYMENT_TIMED_OUT
                  ? 'Payment timed out'
                  : 'Payment declined',
            });
      await this.outbox.stage(event, tx);
      return current;
    });
  }
}
