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
      .useValue({})
      .overrideProvider(AmqpConnectionManager)
      .useValue(new AmqpConnectionManager())
      .overrideProvider(AmqpConnection)
      .useValue({ managedChannel: { addSetup: jest.fn() } })
      .compile();

    app = moduleFixture.createNestApplication();
    configureHttp(app);
    await app.init();
  });

  it('GET /api/ping responds with pong', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/ping')
      .expect(200);
    expect(body).toMatchObject({ data: 'pong' });
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });
});
