import { IdempotencyStorage } from '@nestjs/idempotency';
import { idempotencyStoreContract } from '@nestjs/idempotency/testing';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaService } from '../infra/persistence/prisma.service.js';
import { PrismaIdempotencyStore } from './prisma-idempotency.store.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithPostgres = databaseUrl ? describe : describe.skip;

describeWithPostgres('PrismaIdempotencyStore (PostgreSQL)', () => {
  const schema = `idempotency_test_${randomUUID().replaceAll('-', '')}`;
  const url = databaseUrl ? new URL(databaseUrl) : undefined;
  url?.searchParams.set('options', `-c search_path=${schema}`);
  const adapter = new PrismaPg({ connectionString: url?.href }, { schema });
  const db = new PrismaClient({ adapter });
  let store: PrismaIdempotencyStore;
  let now: number;

  beforeAll(async () => {
    const migration = await readFile(
      join(
        __dirname,
        '../../../prisma/migrations/20261125181953_idempotency_table/migration.sql',
      ),
      'utf8',
    );
    const connection = await adapter.connect();
    try {
      await connection.executeScript(
        `CREATE SCHEMA "${schema}";\n${migration}`,
      );
    } finally {
      await connection.dispose();
    }

    const module = await Test.createTestingModule({
      providers: [
        PrismaIdempotencyStore,
        { provide: PrismaService, useValue: db },
        { provide: IdempotencyStorage, useValue: new IdempotencyStorage() },
      ],
    }).compile();
    store = module.get(PrismaIdempotencyStore);
  });

  beforeEach(() => {
    now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    try {
      await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await db.$disconnect();
    }
  });

  const cases = idempotencyStoreContract(() => store, {
    concurrent: true,
    advanceTime: (ms) => {
      now += ms;
    },
  });
  for (const { name, run } of cases) it(name, run);

  it('prunes expired rows up to the limit and retains the active lock', async () => {
    await db.idempotencyKey.deleteMany();
    await store.acquire('expired-lock', 'owner', 'fp-lock', 100);
    await store.acquire('expired-record', 'owner', 'fp-record', 200);
    await store.complete(
      'expired-record',
      'owner',
      { status: 201, headers: {}, body: { orderId: 'order' } },
      100,
    );
    await store.acquire('active', 'owner', 'fp-active', 200);
    now += 100;

    await expect(store.prune(1)).resolves.toBe(1);
    await expect(store.prune()).resolves.toBe(1);
    await expect(
      db.idempotencyKey.findMany({ select: { key: true } }),
    ).resolves.toEqual([{ key: 'active' }]);
  });
});
