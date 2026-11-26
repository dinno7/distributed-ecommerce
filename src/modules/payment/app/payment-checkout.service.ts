import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStartedEvent } from '../../../common/contracts/messages';
import { TransactionManager } from '../../../common/ports/transaction.port';
import { type Payment, PaymentStatus } from '../domain/payment.entity';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { PaymentOutboxRepository } from './ports/payment-outbox.repository';
import { PaymentRepository } from './ports/payment.repository';

@Injectable()
export class PaymentCheckoutService {
  constructor(
    private readonly gateways: PaymentGatewayRegistry,
    private readonly paymentRepo: PaymentRepository,
    private readonly outbox: PaymentOutboxRepository,
    private readonly txManager: TransactionManager,
  ) {}

  async prepare(payment: Payment): Promise<Payment> {
    if (
      payment.status !== PaymentStatus.AWAITING_CUSTOMER ||
      payment.checkoutUrl !== null
    ) {
      return payment;
    }

    const gateway = this.gateways.get(payment.gatewayName);
    const { checkoutUrl } = await gateway.createCheckout(payment);

    return this.txManager.run(async (tx) => {
      const current = await this.paymentRepo.findByIdForUpdate(payment.id, tx);
      if (!current) throw new NotFoundException('Payment not found');
      if (
        current.status !== PaymentStatus.AWAITING_CUSTOMER ||
        current.checkoutUrl !== null
      ) {
        return current;
      }

      const ready = await this.paymentRepo.setCheckoutUrl(
        current.id,
        checkoutUrl,
        tx,
      );
      await this.outbox.stage(
        new PaymentStartedEvent({
          orderId: ready.orderId,
          paymentId: ready.id,
          attemptNo: ready.attempt,
        }),
        tx,
      );
      return ready;
    });
  }
}
