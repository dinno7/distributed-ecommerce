import type { AuditLog } from './domain/audit.entity';

export function toAuditEvent(log: AuditLog) {
  return {
    id: log.id,
    event: log.origin.routingKey,
    createdAt: log.createdAt.toISOString(),
    payload: log.payload,
  };
}
