import { NotFoundException } from '@nestjs/common';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import { Money } from '../../../../common/value-objects/money';
import {
  Payment,
  PaymentFailureCode,
  PaymentRetryNotEligibleError,
  PaymentStatus,
} from '../../domain/payment.entity';
import { PaymentCheckoutService } from '../payment-checkout.service';
import { PaymentGatewayRegistry } from '../payment-gateway.registry';
import { RetryPaymentUC } from './retry-payment.uc';

describe('RetryPaymentUC', () => {
  it('locks the failed payment and replays its successor even after settlement', async () => {
    const tx: TransactionCtx = {};
    const amount = new Money(250n);
    const failed = new Payment(
      'failed',
      'order',
      1,
      amount,
      {
        status: PaymentStatus.FAILED,
        failureCode: PaymentFailureCode.PAYMENT_DECLINED,
      },
      'selected',
    );
    let created: Payment | undefined;
    const payments = {
      create: jest.fn(async (payment: Payment) => {
        created = payment;
        return true;
      }),
      findById: jest.fn(),
      findLatestByOrderId: jest.fn(),
      update: jest.fn(),
      findByIdForUpdate: jest.fn(async (id: string) =>
        id === failed.id ? failed : (created ?? null),
      ),
      findByOrderIdAndAttempt: jest.fn().mockResolvedValue(null),
      setCheckoutUrl: jest.fn(
        async (id: string, url: string) =>
          new Payment(
            id,
            'order',
            2,
            amount,
            {
              status: PaymentStatus.AWAITING_CUSTOMER,
              failureCode: null,
            },
            'selected',
            url,
          ),
      ),
    };
    const gateway = {
      createCheckout: jest
        .fn()
        .mockResolvedValue({ checkoutUrl: 'https://example.test/checkout' }),
      resolveCallback: jest.fn(),
    };
    const outbox = { stage: jest.fn() };
    const transactions = {
      run: <T>(work: (tx: TransactionCtx) => Promise<T>) => work(tx),
    };
    const checkout = new PaymentCheckoutService(
      new PaymentGatewayRegistry([['selected', gateway]]),
      payments,
      outbox,
      transactions,
    );
    const useCase = new RetryPaymentUC(payments, transactions, checkout);
    const input = failed.id;

    await expect(useCase.execute('unknown')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    payments.findByIdForUpdate.mockResolvedValueOnce(
      Payment.create('order', amount),
    );
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      PaymentRetryNotEligibleError,
    );
    const next = await useCase.execute(input);
    expect(next).toMatchObject({
      attempt: 2,
      orderId: failed.orderId,
      amount,
      gatewayName: 'selected',
      checkoutUrl: 'https://example.test/checkout',
    });
    next.settle({ status: PaymentStatus.SUCCEEDED, failureCode: null });
    payments.findByOrderIdAndAttempt.mockResolvedValueOnce(next);
    await expect(useCase.execute(input)).resolves.toBe(next);

    expect(payments.findByIdForUpdate).toHaveBeenCalledWith(failed.id, tx);
    expect(payments.findByOrderIdAndAttempt).toHaveBeenCalledWith(
      failed.orderId,
      2,
      tx,
    );
    expect(payments.create).toHaveBeenCalledTimes(1);
    expect(gateway.createCheckout).toHaveBeenCalledTimes(1);
    expect(outbox.stage).toHaveBeenCalledTimes(1);
  });
});
