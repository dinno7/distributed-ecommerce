import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { type ConsumeMessage } from 'amqplib';
import { AuditRepositoryPrisma } from './audit.repository';
import { AuditLog } from './domain/audit.entity';
import { EXCHANGES } from '../../common/contracts/exchanges';
import { SseService } from '../../common';
import { toAuditEvent } from './audit-event';

@Injectable()
export class AuditConsumer {
  private logger = new Logger(AuditConsumer.name);

  constructor(
    private readonly auditRepo: AuditRepositoryPrisma,
    private readonly sseService: SseService,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.AUDIT,
    routingKey: '',
    queue: 'q.audit',
    queueOptions: {
      durable: true,
    },
  })
  async consume(payload: unknown, msg: ConsumeMessage) {
    this.logger.log(
      `new event from ${msg.fields.exchange}-->${msg.fields.routingKey}`,
    );
    const publishedAtNumber =
      typeof msg.properties.timestamp === 'number' ||
      !Number.isFinite(Number(msg.properties.timestamp))
        ? Number(msg.properties.timestamp)
        : null;
    const log = AuditLog.create({
      correlationId: msg.properties.correlationId,
      routingKey: msg.fields.routingKey,
      payload,
      exchange: msg.fields.exchange,
      headers: msg.properties.headers,
      messageId: msg.properties.messageId,
      publishedAt: publishedAtNumber
        ? new Date(publishedAtNumber * 1000)
        : null,
    });
    await this.auditRepo.recordLog(log);
    this.sseService.emit({ id: log.id, data: toAuditEvent(log) });
  }
}
