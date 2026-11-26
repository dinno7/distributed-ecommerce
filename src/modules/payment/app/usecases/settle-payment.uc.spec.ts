import { NotFoundException } from '@nestjs/common';
import {
  PaymentFailedEvent,
  PaymentSucceededEvent,
} from '../../../../common/contracts/messages';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import { Money } from '../../../../common/value-objects/money';
import {
  Payment,
  PaymentAlreadyFinalError,
  PaymentFailureCode,
  PaymentStatus,
} from '../../domain/payment.entity';
import { PaymentGatewayRegistry } from '../payment-gateway.registry';
import { SettlePaymentUC } from './settle-payment.uc';

describe('SettlePaymentUC', () => {
  const tx: TransactionCtx = {};
  const transactions = {
    run: <T>(work: (tx: TransactionCtx) => Promise<T>) => work(tx),
  };
  const success = { status: PaymentStatus.SUCCEEDED, failureCode: null };
  const timeout = {
    status: PaymentStatus.FAILED,
    failureCode: PaymentFailureCode.PAYMENT_TIMED_OUT,
  };

  it.each([
    [
      success,
      PaymentSucceededEvent.ROUTING_KEY,
      { amountMinor: '250', currency: 'IRR' },
    ],
    [
      timeout,
      PaymentFailedEvent.ROUTING_KEY,
      { errorCode: timeout.failureCode },
    ],
  ] as const)(
    'stages one event for %j and replays the stored result',
    async (outcome, routingKey, payload) => {
      const payment = new Payment(
        'payment',
        'order',
        2,
        new Money(250n),
        {
          status: PaymentStatus.AWAITING_CUSTOMER,
          failureCode: null,
        },
        'selected',
        'https://example.test/checkout',
      );
      const payments = {
        create: jest.fn(),
        findLatestByOrderId: jest.fn(),
        findByOrderIdAndAttempt: jest.fn(),
        setCheckoutUrl: jest.fn(),
        update: jest.fn(),
        findById: jest.fn().mockResolvedValue(payment),
        findByIdForUpdate: jest.fn().mockResolvedValue(payment),
      };
      const gateway = {
        createCheckout: jest.fn(),
        resolveCallback: jest.fn().mockResolvedValue(outcome),
      };
      const gateways = new PaymentGatewayRegistry([['selected', gateway]]);
      const outbox = { stage: jest.fn() };
      const useCase = new SettlePaymentUC(
        payments,
        transactions,
        gateways,
        outbox,
      );
      const input = {
        paymentId: payment.id,
        gatewayName: 'selected',
        payload: {},
      };

      await expect(
        useCase.execute({ ...input, gatewayName: 'mock' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(gateway.resolveCallback).not.toHaveBeenCalled();
      await expect(useCase.execute(input)).resolves.toMatchObject({
        ...outcome,
        checkoutUrl: null,
      });
      await expect(useCase.execute(input)).resolves.toBe(payment);
      gateway.resolveCallback.mockResolvedValueOnce(
        outcome === success ? timeout : success,
      );
      await expect(useCase.execute(input)).rejects.toBeInstanceOf(
        PaymentAlreadyFinalError,
      );

      expect(payments.update).toHaveBeenCalledTimes(1);
      expect(payments.update).toHaveBeenCalledWith(payment, tx);
      expect(outbox.stage).toHaveBeenCalledTimes(1);
      expect(outbox.stage).toHaveBeenCalledWith(
        expect.objectContaining({
          routingKey,
          payload: expect.objectContaining({
            orderId: 'order',
            paymentId: 'payment',
            attemptNo: 2,
            ...payload,
          }),
        }),
        tx,
      );
    },
  );
});
