import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MessagePublisher } from '../ports/message-publisher.port';
import { EventMessage } from '../../domain/value-objects/event-message.vo';
import { OutboxRelayRepository } from '../ports/outbox.repositor';

export abstract class BaseOutboxRelay implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  protected abstract readonly logger: Logger;

  constructor(
    private readonly repo: OutboxRelayRepository,
    private readonly publisher: MessagePublisher,
    private readonly pollIntervalMs = 500,
    private readonly batchSize = 25,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), this.pollIntervalMs);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const batch = await this.repo.claimBatch(this.batchSize);
      for (const record of batch) {
        try {
          const msg = new EventMessage(record.payload, record.routingKey, {
            eventId: record.id,
            occurredAt: record.occurredAt,
            exchangeName: record.exchangeName,
          });
          await this.publisher.publish(msg);
          await this.repo.markPublished(record.id);
        } catch (err) {
          this.logger.warn(
            `Outbox publish failed for ${record.id}: ${String(err)}`,
          );
          await this.repo.markFailed(record.id, 3000);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
