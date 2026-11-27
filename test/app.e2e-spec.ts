import {
  AmqpConnection,
  AmqpConnectionManager,
} from '@golevelup/nestjs-rabbitmq';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/common/infra/persistence/prisma.service';
import { configureHttp } from '../src/http.config';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const queryRaw = jest.fn();
  const rabbitmq = { connected: true, managedChannel: { addSetup: jest.fn() } };

  beforeAll(async () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      DATABASE_URL: 'postgresql://localhost/distributed-ecommerce_test',
      RABBITMQ_URL: 'amqp://localhost',
    });
    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: queryRaw })
      .overrideProvider(AmqpConnectionManager)
      .useValue(new AmqpConnectionManager())
      .overrideProvider(AmqpConnection)
      .useValue(rabbitmq)
      .compile();

    app = moduleFixture.createNestApplication();
    configureHttp(app);
    await app.init();
  });

  beforeEach(() => {
    queryRaw.mockReset();
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    rabbitmq.connected = true;
  });

  it('GET /api/ping responds with pong', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/ping')
      .expect(200);
    expect(body).toMatchObject({ data: 'pong' });
  });

  it('GET /api/health reports both dependencies up', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(body.data).toMatchObject({
      status: 'ok',
      details: { postgres: { status: 'up' }, rabbitmq: { status: 'up' } },
    });
    expect(queryRaw).toHaveBeenCalledWith(['SELECT 1']);
  });

  it('GET /api/health returns 503 when PostgreSQL fails', async () => {
    queryRaw.mockRejectedValue(new Error('connection details'));

    const { body } = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);
    expect(body).toMatchObject({
      status: 'error',
      details: {
        postgres: { status: 'down', message: 'PostgreSQL probe failed' },
        rabbitmq: { status: 'up' },
      },
    });
  });

  it('GET /api/health returns 503 when RabbitMQ disconnects', async () => {
    rabbitmq.connected = false;

    const { body } = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);
    expect(body).toMatchObject({
      status: 'error',
      details: { postgres: { status: 'up' }, rabbitmq: { status: 'down' } },
    });
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });
});
