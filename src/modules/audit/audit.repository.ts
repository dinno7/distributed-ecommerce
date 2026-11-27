import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common';
import { AuditLog } from './domain/audit.entity';
import { AuditMapperPrisma } from './audit.repository.mapper';

@Injectable()
export class AuditRepositoryPrisma {
  constructor(private readonly db: PrismaService) {}

  async findPage(take: number, skip: number, cursor?: string) {
    const rows = await this.db.auditLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : skip,
      take: take + 1,
    });
    const logs = rows.slice(0, take);
    return {
      logs: logs.map((row) => AuditMapperPrisma.toDomain(row)),
      nextCursor: rows.length > take ? rows[take - 1].id : null,
    };
  }

  async recordLog(auditLog: AuditLog): Promise<boolean> {
    const { count } = await this.db.auditLog.createMany({
      data: AuditMapperPrisma.toPersistence(auditLog),
      skipDuplicates: true,
    });
    return count > 0;
  }
}
