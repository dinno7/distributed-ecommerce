import { Injectable } from '@nestjs/common';
import type { FulfillmentItemMessage } from '../../../common/contracts/messages';
import type { EventMessage } from '../../../common/domain/value-objects/event-message.vo';
import { PrismaService } from '../../../common/infra/persistence/prisma.service';
import type {
  OutboxRecord,
  OutboxRelayRepository,
} from '../../../common/messaging/ports/outbox.repositor';
import type { TransactionCtx } from '../../../common/ports/transaction.port';
import type { Prisma } from '../../../generated/prisma/client';
import type { FulfillmentStore } from '../app/fulfillment-attempt';

@Injectable()
export class PrismaFulfillmentStore
  implements FulfillmentStore, OutboxRelayRepository
{
  constructor(private readonly db: PrismaService) {}

  async claim(
    { orderItemId, attemptNo }: FulfillmentItemMessage,
    tx: TransactionCtx,
  ): Promise<boolean> {
    const db = tx as Prisma.TransactionClient;
    const result = await db.fulfillmentAttempt.createMany({
      data: { orderItemId, attemptNo },
      skipDuplicates: true,
    });
    return result.count === 1;
  }

  async finish(
    { orderItemId, attemptNo }: FulfillmentItemMessage,
    errorCode: string | null,
    tx: TransactionCtx,
  ): Promise<void> {
    if (errorCode === null) return;
    const db = tx as Prisma.TransactionClient;
    await db.fulfillmentAttempt.update({
      where: { orderItemId_attemptNo: { orderItemId, attemptNo } },
      data: { errorCode },
    });
  }

  async stage(
    event: EventMessage<FulfillmentItemMessage>,
    tx: TransactionCtx,
  ): Promise<void> {
    const db = tx as Prisma.TransactionClient;
    await db.fulfillmentOutbox.create({
      data: {
        id: event.eventId,
        exchangeName: event.exchangeName,
        routingKey: event.routingKey,
        payload: { ...event.payload },
        createdAt: event.occurredAt,
      },
    });
  }

  claimBatch(limit: number): Promise<OutboxRecord[]> {
    return this.db.$queryRaw<OutboxRecord[]>`
      WITH claimed AS (
        SELECT id FROM fulfillment_outbox WHERE next_attempt_at <= NOW()
        ORDER BY next_attempt_at, id LIMIT ${limit} FOR UPDATE SKIP LOCKED
      )
      UPDATE fulfillment_outbox AS event
      SET next_attempt_at = NOW() + INTERVAL '30 seconds'
      FROM claimed WHERE event.id = claimed.id
      RETURNING event.id, event.exchange_name AS "exchangeName",
        event.routing_key AS "routingKey", event.created_at AS "occurredAt", event.payload
    `;
  }

  async markPublished(id: string): Promise<void> {
    await this.db.fulfillmentOutbox.deleteMany({ where: { id } });
  }

  async markFailed(id: string, retryAfterMs: number): Promise<void> {
    await this.db.fulfillmentOutbox.updateMany({
      where: { id },
      data: { nextAttemptAt: new Date(Date.now() + retryAfterMs) },
    });
  }
}
