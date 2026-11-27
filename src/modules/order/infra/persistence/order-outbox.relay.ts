import { Injectable } from '@nestjs/common';
import {
  OutboxRecord,
  OutboxRelayRepository,
} from '../../../../common/messaging/ports/outbox.repositor';
import { PrismaService } from '../../../../common';

@Injectable()
export class OrderOutboxRelayRepositoryPrisma implements OutboxRelayRepository {
  constructor(private readonly db: PrismaService) {}

  async claimBatch(limit: number): Promise<OutboxRecord[]> {
    const result = await this.db.$queryRaw<OutboxRecord[]>`
      WITH claimed AS (
        SELECT * FROM orders_outbox
        WHERE
          status IN ('PENDING', 'FAILED')
          AND
          next_attempt_at <= NOW()
          ORDER BY created_at ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
      )
      UPDATE orders_outbox o
      SET
        attempts = o.attempts + 1,
        next_attempt_at = NOW() + INTERVAL '30 seconds'
      FROM claimed
      WHERE o.id = claimed.id
      RETURNING o.id, o.exchange_name as "exchangeName", o.routing_key as "routingKey", o.created_at AS "occurredAt", o.payload;`;
    return result;
  }

  async markPublished(id: string): Promise<void> {
    await this.db.orderOutbox.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
      },
    });
    return;
  }

  async markFailed(id: string, retryAfterMs: number): Promise<void> {
    await this.db.orderOutbox.updateMany({
      where: { id, status: { not: 'PUBLISHED' } },
      data: {
        status: 'PENDING',
        nextAttemptAt: new Date(Date.now() + retryAfterMs),
      },
    });
    return;
  }
}
