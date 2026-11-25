import { OrderCreatedEvent } from '../../../../common/contracts/messages';
import { ROUTING_KEYS } from '../../../../common/contracts/routing-keys';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import { OrderOutboxRepositoryPrisma } from './order-outbox.repository';

describe('OrderOutboxRepositoryPrisma', () => {
  it('stages the full event using the supplied transaction', async () => {
    const create = jest.fn();
    const tx = { orderOutbox: { create } };
    const repository = new OrderOutboxRepositoryPrisma();
    const event = new OrderCreatedEvent(ROUTING_KEYS.OrderCreated, {
      orderId: '019338a0-0000-7000-8000-00000000000a',
      customerId: '019338a0-0000-7000-8000-00000000000b',
      totalMinor: '850',
      currency: 'IRR',
      itemCount: 2,
    });

    await repository.stage(event, tx as TransactionCtx);

    expect(create).toHaveBeenCalledWith({
      data: {
        id: event.eventId,
        orderId: event.payload.orderId,
        routingKey: event.routingKey,
        payload: event.payload,
        createdAt: event.occurredAt,
      },
    });
  });
});
