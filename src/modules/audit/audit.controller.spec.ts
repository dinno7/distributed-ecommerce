import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { PaginationDto, PrismaService, SseService } from '../../common';
import { AuditController } from './audit.controller';
import { AuditRepositoryPrisma } from './audit.repository';
import { AuditMapperPrisma } from './audit.repository.mapper';
import { AuditLog } from './domain/audit.entity';

describe('AuditController', () => {
  let controller: AuditController;
  let stream: SseService;
  let module: TestingModule;
  const log = AuditLog.create({
    exchange: 'x.main',
    routingKey: 'order.created',
    payload: { orderId: 'order-1' },
    headers: { internal: 'header' },
  });
  const findMany = jest.fn();

  beforeEach(async () => {
    findMany.mockReset();
    findMany.mockResolvedValue([AuditMapperPrisma.toPersistence(log)]);
    module = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        SseService,
        AuditRepositoryPrisma,
        {
          provide: PrismaService,
          useValue: { auditLog: { findMany } },
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    stream = module.get<SseService>(SseService);
  });

  afterEach(async () => {
    await module?.close();
  });

  it('returns stored events with their IDs, routing keys, timestamps and payloads', async () => {
    await expect(controller.findPage(new PaginationDto())).resolves.toEqual({
      items: [
        {
          id: log.id,
          event: 'order.created',
          createdAt: log.createdAt.toISOString(),
          payload: { orderId: 'order-1' },
        },
      ],
      nextCursor: null,
    });
    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: undefined,
      skip: 0,
      take: 11,
    });
  });

  it('skips the cursor and uses a lookahead row to indicate another page', async () => {
    const row = AuditMapperPrisma.toPersistence(log);
    findMany.mockResolvedValue([row, { ...row, id: 'older' }]);
    const pagination = Object.assign(new PaginationDto(), {
      per_page: 1,
      cursor: 'anchor',
    });
    const page = await controller.findPage(pagination);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: { id: 'anchor' },
      skip: 1,
      take: 2,
    });
    expect(page.items.map((item) => item.id)).toEqual([log.id]);
    expect(page.nextCursor).toBe(log.id);
  });

  it('forwards live events to stream subscribers', async () => {
    const received = firstValueFrom(controller.sse());
    const {
      items: [data],
    } = await controller.findPage(new PaginationDto());
    stream.emit({ id: log.id, data });
    await expect(received).resolves.toEqual({ id: log.id, data });
  });
});
