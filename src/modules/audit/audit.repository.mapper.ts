import {
  AuditLog as PrismaAuditLog,
  Prisma,
} from '../../generated/prisma/client';
import { AuditLog } from './domain/audit.entity';
import { MessageOrigin } from './domain/message-origin.vo';
import { TraceContext } from './domain/trace-ctx.vo';

export class AuditMapperPrisma {
  static toDomain(raw: PrismaAuditLog): AuditLog {
    return AuditLog.reconstitute({
      id: raw.id,
      origin: new MessageOrigin(raw.exchange, raw.routingKey),
      trace: new TraceContext(raw.messageId, raw.correlationId),
      payload: raw.payload,
      headers: this.isRecord(raw.headers) ? raw.headers : null,
      publishedAt: raw.publishedAt,
      createdAt: raw.createdAt,
    });
  }

  static toPersistence(entity: AuditLog): Prisma.AuditLogUncheckedCreateInput {
    return {
      id: entity.id,
      exchange: entity.origin.exchange,
      routingKey: entity.origin.routingKey,
      messageId: entity.trace.messageId,
      correlationId: entity.trace.correlationId,
      payload: (entity.payload ?? {}) as Prisma.InputJsonValue,
      headers: entity.headers
        ? (entity.headers as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      publishedAt: entity.publishedAt,
      createdAt: entity.createdAt,
    };
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
