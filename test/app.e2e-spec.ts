import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/common/infra/persistence/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      DATABASE_URL: 'postgresql://localhost/snapshop_test',
      RABBITMQ_URL: 'amqp://localhost',
    });
    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('GET /ping responds with pong', () => {
    return request(app.getHttpServer()).get('/ping').expect(200).expect('pong');
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });
});
