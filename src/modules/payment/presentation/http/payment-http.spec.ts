import { NotFoundException, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Money } from '../../../../common/value-objects/money';
import { configureHttp } from '../../../../http.config';
import { PaymentRepository } from '../../app/ports/payment.repository';
import { GetLatestPaymentUC } from '../../app/usecases/get-latest-payment.uc';
import { GetPaymentUC } from '../../app/usecases/get-payment.uc';
import { RetryPaymentUC } from '../../app/usecases/retry-payment.uc';
import { SettlePaymentUC } from '../../app/usecases/settle-payment.uc';
import {
  Payment,
  PaymentAlreadyFinalError,
  PaymentFailureCode,
  PaymentRetryNotEligibleError,
  PaymentStatus,
} from '../../domain/payment.entity';
import { MockPaymentGateway } from '../../infra/gateway/mock-payment.gateway';
import { PaymentController } from './payment.controller';

describe('Payment HTTP', () => {
  const orderId = '550e8400-e29b-41d4-a716-446655440000';
  const initial = Payment.create(orderId, new Money(9007199254740993n));
  const paymentUrl = `/api/v1/payments?orderId=${orderId}`;
  const retryUrl = `/api/v1/payments/${initial.id}/retry`;
  const payments = { findLatestByOrderId: jest.fn() };
  const get = { execute: jest.fn() };
  const retry = { execute: jest.fn() };
  const settle = { execute: jest.fn() };
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentRepository, useValue: payments },
        GetLatestPaymentUC,
        { provide: GetPaymentUC, useValue: get },
        { provide: RetryPaymentUC, useValue: retry },
        { provide: SettlePaymentUC, useValue: settle },
      ],
    }).compile();
    app = module.createNestApplication();
    configureHttp(app);
    await app.init();
  });

  afterAll(async () => app?.close());

  it('reports pending for a reserved payment and 404 before a payment exists', async () => {
    payments.findLatestByOrderId.mockResolvedValue(null);
    await request(app.getHttpServer()).get(paymentUrl).expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/payments?orderId=bad')
      .expect(400);
    const expected = {
      paymentId: null,
      status: 'PENDING',
      checkoutUrl: null,
      amountMinor: '9007199254740993',
      currency: 'IRR',
    };
    payments.findLatestByOrderId.mockResolvedValueOnce(initial);
    await request(app.getHttpServer())
      .get(paymentUrl)
      .expect(200)
      .expect(({ body }) => expect(body.data).toEqual(expected));
    expect(payments.findLatestByOrderId).toHaveBeenCalledWith(orderId);
  });

  it('validates retry requests and returns the successor or a conflict', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/bad/retry')
      .expect(400);
    retry.execute.mockResolvedValueOnce(initial);
    await request(app.getHttpServer())
      .post(retryUrl)
      .expect(201)
      .expect(({ body: response }) =>
        expect(response.data).toEqual({ paymentId: initial.id }),
      );
    expect(retry.execute).toHaveBeenCalledWith(initial.id);
    retry.execute.mockRejectedValueOnce(new PaymentRetryNotEligibleError());
    await request(app.getHttpServer())
      .post(retryUrl)
      .expect(409)
      .expect(({ body: response }) =>
        expect(response.errorCode).toBe('PAYMENT_RETRY_NOT_ELIGIBLE'),
      );
  });

  it('returns payment details with a gateway URL and accepts simulated callbacks directly', async () => {
    const gateway = new MockPaymentGateway(
      new ConfigService({ app: { port: 3000 } }),
    );
    const { checkoutUrl } = await gateway.createCheckout(initial);
    const detailsUrl = `/api/v1/payments/${initial.id}`;
    const callbackUrl = `${detailsUrl}/callback`;
    const ready = new Payment(
      initial.id,
      orderId,
      1,
      initial.amount,
      { status: PaymentStatus.AWAITING_CUSTOMER, failureCode: null },
      'mock',
      checkoutUrl,
    );
    get.execute.mockResolvedValueOnce(ready);
    await request(app.getHttpServer())
      .get(detailsUrl)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toEqual({
          paymentId: initial.id,
          orderId,
          checkoutUrl,
          status: PaymentStatus.AWAITING_CUSTOMER,
          amountMinor: '9007199254740993',
          currency: 'IRR',
        }),
      );
    payments.findLatestByOrderId.mockResolvedValueOnce(ready);
    await request(app.getHttpServer())
      .get(paymentUrl)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toEqual({
          paymentId: initial.id,
          checkoutUrl,
          status: PaymentStatus.AWAITING_CUSTOMER,
          amountMinor: '9007199254740993',
          currency: 'IRR',
        }),
      );
    expect(get.execute).toHaveBeenCalledWith(initial.id);
    get.execute.mockRejectedValueOnce(new NotFoundException());
    await request(app.getHttpServer()).get(detailsUrl).expect(404);
    await request(app.getHttpServer())
      .post(callbackUrl)
      .send({ result: 'UNKNOWN' })
      .expect(400);
    expect(settle.execute).not.toHaveBeenCalled();

    ready.settle({
      status: PaymentStatus.FAILED,
      failureCode: PaymentFailureCode.PAYMENT_DECLINED,
    });
    settle.execute.mockResolvedValueOnce(ready);
    await request(app.getHttpServer())
      .post(callbackUrl)
      .send({ result: 'DECLINE' })
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toEqual({
          paymentId: initial.id,
          orderId,
          status: 'FAILED',
          checkoutUrl: null,
          amountMinor: '9007199254740993',
          currency: 'IRR',
          failureCode: 'PAYMENT_DECLINED',
        }),
      );
    expect(settle.execute).toHaveBeenCalledWith({
      paymentId: initial.id,
      gatewayName: 'mock',
      payload: { result: 'DECLINE' },
    });
    settle.execute
      .mockRejectedValueOnce(new PaymentAlreadyFinalError())
      .mockRejectedValueOnce(new NotFoundException());
    await request(app.getHttpServer())
      .post(callbackUrl)
      .send({ result: 'SUCCESS' })
      .expect(409)
      .expect(({ body }) =>
        expect(body.errorCode).toBe('PAYMENT_ALREADY_FINAL'),
      );
    await request(app.getHttpServer())
      .post(callbackUrl)
      .send({ result: 'SUCCESS' })
      .expect(404);
  });
});
