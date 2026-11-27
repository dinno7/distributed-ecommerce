import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/infra/persistence/prisma.service';
import type {
  OutboxRecord,
  OutboxRelayRepository,
} from '../../../../common/messaging/ports/outbox.repositor';

@Injectable()
export class PaymentOutboxRelayRepositoryPrisma implements OutboxRelayRepository {
  constructor(private readonly db: PrismaService) {}

  claimBatch(limit: number): Promise<OutboxRecord[]> {
    return this.db.$queryRaw<OutboxRecord[]>`
      WITH claimed AS (
        SELECT id FROM payment_outbox
        WHERE next_attempt_at <= NOW()
        ORDER BY next_attempt_at, id
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE payment_outbox AS event
      SET next_attempt_at = NOW() + INTERVAL '30 seconds'
      FROM claimed
      WHERE event.id = claimed.id
      RETURNING event.id, event.exchange_name AS "exchangeName",
                event.routing_key AS "routingKey", event.created_at AS "occurredAt", event.payload
    `;
  }

  async markPublished(id: string): Promise<void> {
    await this.db.paymentOutbox.deleteMany({ where: { id } });
  }

  async markFailed(id: string, retryAfterMs: number): Promise<void> {
    await this.db.paymentOutbox.updateMany({
      where: { id },
      data: { nextAttemptAt: new Date(Date.now() + retryAfterMs) },
    });
  }
}
