import { Injectable } from '@nestjs/common';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type { EventMessage } from '../../../../common/types/event-message';
import type { Prisma } from '../../../../generated/prisma/client.js';
import type { OrderOutboxRepository } from '../../app/ports/order-outbox.repository';

@Injectable()
export class OrderOutboxRepositoryPrisma implements OrderOutboxRepository {
  async stage(
    event: EventMessage<{ orderId: string }>,
    tx: TransactionCtx,
  ): Promise<void> {
    const transaction = tx as Prisma.TransactionClient;
    await transaction.orderOutbox.create({
      data: {
        id: event.eventId,
        orderId: event.payload.orderId,
        routingKey: event.routingKey,
        payload: { ...event.payload },
        createdAt: event.occurredAt,
      },
    });
  }
}
