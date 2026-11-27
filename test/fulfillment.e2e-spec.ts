import { filter, firstValueFrom, timeout } from 'rxjs';
import { AuditController } from '../src/modules/audit/audit.controller';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { EventMessage } from '../src/common/domain/value-objects/event-message.vo';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { configureHttp } from '../src/http.config';
import { PrismaService } from '../src/common/infra/persistence/prisma.service';
import { FulfillPhysicalCommand } from '../src/common/contracts/messages';
import { MessagePublisher } from '../src/common/messaging/ports/message-publisher.port';
import { PhysicalFulfillment } from '../src/modules/fulfillment/physical/app/ports/physical.port';

const enabled =
  process.env.FULFILLMENT_TEST_DATABASE_URL &&
  process.env.FULFILLMENT_TEST_RABBITMQ_URL;

(enabled ? describe : describe.skip)(
  'Post-payment fulfillment (PostgreSQL and RabbitMQ)',
  () => {
    let app: INestApplication<App>;
    let db: PrismaService;

    beforeAll(async () => {
      jest.replaceProperty(process, 'env', {
        ...process.env,
        DATABASE_URL: process.env.FULFILLMENT_TEST_DATABASE_URL,
        RABBITMQ_URL: process.env.FULFILLMENT_TEST_RABBITMQ_URL,
      });
      const { AppModule } = await import('../src/app.module.js');
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication<INestApplication<App>>();
      configureHttp(app);
      await app.init();
      db = app.get(PrismaService);
    }, 20_000);

    afterAll(async () => {
      await app?.close();
      jest.restoreAllMocks();
    });

    it('serializes stock and renewals, retries a failed item, and ignores redelivery', async () => {
      const api = request(app.getHttpServer());
      const publisher = app.get(MessagePublisher);
      const publish = jest
        .spyOn(publisher, 'publish')
        .mockRejectedValueOnce(new Error('Simulated broker failure'));
      const customerId = randomUUID();
      const physical = randomUUID();
      const digital = randomUUID();
      const subscription = randomUUID();
      await db.product.create({
        data: {
          id: physical,
          name: 'Last unit',
          type: 'PHYSICAL',
          unitPriceMinor: 500n,
          inventory: { create: { available: 1 } },
        },
      });
      await db.product.createMany({
        data: [
          { id: digital, name: 'Grant', type: 'DIGITAL', unitPriceMinor: 100n },
          {
            id: subscription,
            name: 'Renewal',
            type: 'SUBSCRIPTION',
            unitPriceMinor: 200n,
            subscriptionDays: 2,
          },
        ],
      });
      const items = [physical, digital, subscription].map((productId) => ({
        productId,
        quantity: 1,
      }));
      const create = (key: string) =>
        api
          .post('/api/v1/orders')
          .set('Idempotency-Key', key)
          .send({ customerId, items })
          .expect(201);
      const key = randomUUID();
      const first = await create(key);
      const replay = await create(key);
      expect(replay.headers['idempotent-replayed']).toBe('true');
      expect(replay.body.data.id).toBe(first.body.data.id);
      const second = await create(randomUUID());
      const ids: string[] = [first.body.data.id, second.body.data.id];
      const payments = await eventually(async () => {
        const results = await db.payment.findMany({
          where: { orderId: { in: ids }, checkoutUrl: { not: null } },
        });
        return results.length === 2 ? results : undefined;
      });
      const orderPublishes = publish.mock.calls
        .map(([event]) => event)
        .filter(
          (event) =>
            event.routingKey === 'evt.order.created' &&
            (event.payload as { orderId: string }).orderId === ids[0],
        );
      expect(orderPublishes).toHaveLength(2);
      expect(orderPublishes[0].eventId).toBe(orderPublishes[1].eventId);
      const physicalPort = app.get(PhysicalFulfillment);
      const ship = jest
        .spyOn(physicalPort, 'ship')
        .mockRejectedValueOnce(new Error('Simulated rollback before shipment'));
      const start = Date.now();
      await Promise.all(
        payments.map(({ id }) =>
          api
            .post(`/api/v1/payments/${id}/callback`)
            .send({ result: 'SUCCESS' })
            .expect(200),
        ),
      );

      const finished = await eventually(async () => {
        const rows = await db.order.findMany({
          where: { id: { in: ids } },
          include: { items: true },
        });
        return rows.every(
          ({ status }) =>
            status === 'COMPLETED' || status === 'FULFILLMENT_FAILED',
        )
          ? rows
          : undefined;
      });
      expect(finished.map(({ status }) => status).sort()).toEqual([
        'COMPLETED',
        'FULFILLMENT_FAILED',
      ]);
      const failed = finished.find(
        ({ status }) => status === 'FULFILLMENT_FAILED',
      )!;
      const failedItem = failed.items.find(
        ({ productId }) => productId === physical,
      )!;
      expect(failedItem.lastError).toBe('OUT_OF_STOCK');
      expect(
        await db.inventory.findUnique({ where: { productId: physical } }),
      ).toMatchObject({ available: 0 });
      expect(
        await db.shipment.count({ where: { item: { orderId: { in: ids } } } }),
      ).toBe(1);
      expect(await db.digitalGrant.count({ where: { customerId } })).toBe(2);
      const renewal = await db.subscription.findUniqueOrThrow({
        where: {
          customerId_productId: { customerId, productId: subscription },
        },
      });
      expect(renewal.expiresAt.getTime()).toBeGreaterThanOrEqual(
        start + 4 * 86_400_000,
      );
      expect(renewal.expiresAt.getTime()).toBeLessThan(
        Date.now() + 4 * 86_400_000 + 1,
      );

      await db.inventory.update({
        where: { productId: physical },
        data: { available: 1 },
      });
      const retryKey = randomUUID();
      const retry = () =>
        api
          .post(`/api/v1/orders/${failed.id}/retry`)
          .set('Idempotency-Key', retryKey)
          .send({ itemId: failedItem.id })
          .expect(202);
      await retry();
      await publisher.publish(
        new FulfillPhysicalCommand({
          orderId: failed.id,
          orderItemId: failedItem.id,
          attemptNo: 1,
          customerId,
          productId: physical,
          quantity: 1,
        }),
      );
      await eventually(async () => {
        const row = await db.order.findUnique({ where: { id: failed.id } });
        return row?.status === 'COMPLETED' ? row : undefined;
      });
      await publisher.publish(
        new FulfillPhysicalCommand({
          orderId: failed.id,
          orderItemId: failedItem.id,
          attemptNo: 2,
          customerId,
          productId: physical,
          quantity: 1,
        }),
      );
      expect((await retry()).headers['idempotent-replayed']).toBe('true');
      expect(ship).toHaveBeenCalledTimes(3);
      expect(
        await db.fulfillmentAttempt.count({
          where: { orderItemId: failedItem.id },
        }),
      ).toBe(2);
      const detail = await api.get(`/api/v1/orders/${failed.id}`).expect(200);
      expect(detail.body.data).toMatchObject({
        status: 'COMPLETED',
        payment: { status: 'SUCCEEDED' },
        shipments: [{ orderItemId: failedItem.id }],
      });
      const listing = await api
        .get('/api/v1/orders')
        .query({ customerId, status: 'COMPLETED', per_page: 1 })
        .expect(200);
      expect(listing.body.data.orders).toHaveLength(1);
      await api.get(`/api/v1/orders/${failed.id}/events`).expect(404);
      const events = await eventually(async () => {
        const response = await api
          .get('/api/v1/audit?per_page=100')
          .expect(200);
        const items: { event: string; payload: { orderId?: string } }[] =
          response.body.data.items;
        const types = items
          .filter(({ payload }) => payload.orderId === failed.id)
          .map(({ event }) => event);
        return types.includes('evt.order.completed') ? types : undefined;
      });
      expect(events).toEqual(
        expect.arrayContaining([
          'evt.payment.succeeded',
          'evt.physical.failed',
          'evt.order.retry_scheduled',
          'evt.physical.shipment_created',
          'evt.order.completed',
        ]),
      );
      expect(
        events.filter((type) => type === 'evt.order.completed'),
      ).toHaveLength(1);
    }, 25_000);

    it('stores and streams a broker event without order data', async () => {
      const routingKey = `evt.integration.${randomUUID()}`;
      const payload = { observed: true };
      const streamed = firstValueFrom(
        app
          .get(AuditController)
          .sse()
          .pipe(
            filter(
              ({ data }) =>
                typeof data === 'object' &&
                data !== null &&
                'event' in data &&
                data.event === routingKey,
            ),
            timeout(5_000),
          ),
      );

      const publisher = app.get(MessagePublisher);
      await publisher.publish(new EventMessage(payload, routingKey));
      await expect(streamed).resolves.toMatchObject({
        data: { event: routingKey, payload },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/audit?per_page=100')
        .expect(200);
      expect(response.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ event: routingKey, payload }),
        ]),
      );
    });

    it('rejects unroutable publishes and dead-letters invalid commands', async () => {
      const publisher = app.get(MessagePublisher);
      await expect(
        publisher.publish(
          new EventMessage({}, randomUUID(), {
            exchangeName: '',
          }),
        ),
      ).rejects.toThrow('Unroutable publication');

      await publisher.publish(
        new EventMessage({}, FulfillPhysicalCommand.ROUTING_KEY),
      );
      const broker = app.get(AmqpConnection);
      await eventually(async () => {
        const queue = await broker.channel.checkQueue(
          'q.fulfills.physical.dlq',
        );
        return queue.messageCount > 0 ? queue : undefined;
      });
    }, 20_000);

    it('records payment timeout without starting fulfillment', async () => {
      const api = request(app.getHttpServer());
      const productId = randomUUID();
      await db.product.create({
        data: {
          id: productId,
          name: 'Skipped grant',
          type: 'DIGITAL',
          unitPriceMinor: 100n,
        },
      });
      const created = await api
        .post('/api/v1/orders')
        .set('Idempotency-Key', randomUUID())
        .send({ customerId: randomUUID(), items: [{ productId, quantity: 1 }] })
        .expect(201);
      const id: string = created.body.data.id;
      const payment = await eventually(async () => {
        return (
          (await db.payment.findFirst({
            where: { orderId: id, checkoutUrl: { not: null } },
          })) ?? undefined
        );
      });
      await api
        .post(`/api/v1/payments/${payment.id}/callback`)
        .send({ result: 'TIMEOUT' })
        .expect(200);
      await eventually(async () => {
        const result = await api.get(`/api/v1/orders/${id}`).expect(200);
        if (result.body.data.status !== 'PAYMENT_FAILED') return;
        expect(result.body.data.items[0]).toMatchObject({
          status: 'SKIPPED',
          attempts: 0,
        });
        return true;
      });
    }, 15_000);
  },
);

async function eventually<T>(check: () => Promise<T | undefined>): Promise<T> {
  const deadline = Date.now() + 15_000;
  do {
    const result = await check();
    if (result !== undefined) return result;
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  throw new Error('Timed out waiting for asynchronous fulfillment');
}
