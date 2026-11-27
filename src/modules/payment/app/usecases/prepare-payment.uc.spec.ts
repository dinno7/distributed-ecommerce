import { PaymentStartedEvent } from '../../../../common/contracts/messages';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import { Money } from '../../../../common/value-objects/money';
import { Payment, PaymentStatus } from '../../domain/payment.entity';
import { PaymentCheckoutService } from '../payment-checkout.service';
import { PaymentGatewayRegistry } from '../payment-gateway.registry';
import { PreparePaymentUC } from './prepare-payment.uc';

describe('PreparePaymentUC', () => {
  it('resumes a reserved attempt after gateway failure and stages checkout once', async () => {
    const tx: TransactionCtx = {};
    const amount = new Money(500n);
    const input = { orderId: 'order', amount, gatewayName: 'selected' };
    const url = 'https://example.test/checkout';
    const gateway = {
      createCheckout: jest
        .fn()
        .mockRejectedValueOnce(new Error('Unavailable'))
        .mockResolvedValue({ checkoutUrl: url }),
      resolveCallback: jest.fn(),
    };
    const gateways = new PaymentGatewayRegistry([['selected', gateway]]);
    let stored: Payment;
    const payments = {
      create: jest
        .fn()
        .mockImplementationOnce(async (payment: Payment) => {
          stored = payment;
          return true;
        })
        .mockResolvedValue(false),
      findByOrderIdAndAttempt: jest.fn(async () => stored),
      findByIdForUpdate: jest.fn(async () => stored),
      findById: jest.fn(),
      findLatestByOrderId: jest.fn(),
      update: jest.fn(),
      setCheckoutUrl: jest.fn(async () => {
        stored = new Payment(
          stored.id,
          stored.orderId,
          1,
          amount,
          {
            status: PaymentStatus.AWAITING_CUSTOMER,
            failureCode: null,
          },
          stored.gatewayName,
          url,
        );
        return stored;
      }),
    };
    const outbox = { stage: jest.fn() };
    const transactions = {
      run: <T>(work: (tx: TransactionCtx) => Promise<T>) => work(tx),
    };
    const checkout = new PaymentCheckoutService(
      gateways,
      payments,
      outbox,
      transactions,
    );
    const useCase = new PreparePaymentUC(
      payments,
      transactions,
      gateways,
      checkout,
    );

    await expect(useCase.execute(input)).rejects.toThrow('Unavailable');
    expect(outbox.stage).not.toHaveBeenCalled();
    await expect(useCase.execute(input)).resolves.toMatchObject({
      id: stored!.id,
      checkoutUrl: url,
    });
    await expect(useCase.execute(input)).resolves.toBe(stored!);
    expect(
      gateway.createCheckout.mock.calls.map(([payment]) => payment.id),
    ).toEqual([stored!.id, stored!.id]);
    expect(outbox.stage).toHaveBeenCalledTimes(1);
    expect(outbox.stage).toHaveBeenCalledWith(
      expect.objectContaining({
        routingKey: PaymentStartedEvent.ROUTING_KEY,
        payload: {
          orderId: input.orderId,
          paymentId: stored!.id,
          attemptNo: 1,
        },
      }),
      tx,
    );
  });
});
