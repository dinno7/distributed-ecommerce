import { Money } from '../../../../common/value-objects/money';
import type { Payment as PaymentRow } from '../../../../generated/prisma/client.js';
import { Payment, PaymentStatus } from '../../domain/payment.entity';

export class PaymentMapper {
  static toDomain(row: PaymentRow): Payment {
    const {
      id,
      orderId,
      attempt,
      amountMinor,
      status,
      failureCode,
      gatewayName,
      checkoutUrl,
    } = row;
    const amount = new Money(amountMinor);
    if (status === PaymentStatus.FAILED) {
      if (failureCode === null)
        throw new Error('Failed payment has no failure code');
      return new Payment(
        id,
        orderId,
        attempt,
        amount,
        { status, failureCode },
        gatewayName,
        checkoutUrl,
      );
    }
    return new Payment(
      id,
      orderId,
      attempt,
      amount,
      {
        status,
        failureCode: null,
      },
      gatewayName,
      checkoutUrl,
    );
  }

  static toPersistence(payment: Payment): PaymentRow {
    return {
      id: payment.id,
      orderId: payment.orderId,
      attempt: payment.attempt,
      amountMinor: payment.amount.minorUnits,
      status: payment.status,
      failureCode: payment.failureCode,
      gatewayName: payment.gatewayName,
      checkoutUrl: payment.checkoutUrl,
    };
  }
}
