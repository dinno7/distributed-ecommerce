import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
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
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
    queueOptions: {
      durable: true,
    },
  })
  async consume(payload: unknown, msg: ConsumeMessage) {
    this.logger.log(
      `new event from ${msg.fields.exchange}-->${msg.fields.routingKey}`,
    );
    const timestamp = msg.properties.headers?.['x-occurred-at'] as unknown;
    const seconds = msg.properties.timestamp;
    const milliseconds =
      typeof timestamp === 'string' ? Date.parse(timestamp) : NaN;
    const publishedAt = Number.isFinite(milliseconds)
      ? new Date(milliseconds)
      : Number.isFinite(seconds)
        ? new Date(seconds * 1000)
        : null;
    const log = AuditLog.create({
      correlationId: msg.properties.correlationId,
      routingKey: msg.fields.routingKey,
      payload,
      exchange: msg.fields.exchange,
      headers: msg.properties.headers,
      messageId: msg.properties.messageId,
      publishedAt,
    });
    if (await this.auditRepo.recordLog(log)) {
      this.sseService.emit({ id: log.id, data: toAuditEvent(log) });
    }
  }
}
