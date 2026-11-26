import { Injectable } from '@nestjs/common';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type { Prisma } from '../../../../generated/prisma/client.js';
import type { PaymentOutboxRepository } from '../../app/ports/payment-outbox.repository';

@Injectable()
export class PaymentOutboxRepositoryPrisma implements PaymentOutboxRepository {
  async stage(
    event: Parameters<PaymentOutboxRepository['stage']>[0],
    tx: TransactionCtx,
  ): Promise<void> {
    const transaction = tx as Prisma.TransactionClient;
    await transaction.paymentOutbox.create({
      data: {
        id: event.eventId,
        exchangeName: event.exchangeName,
        routingKey: event.routingKey,
        payload: { ...event.payload },
        createdAt: event.occurredAt,
      },
    });
  }
}
