import { randomUUID } from 'crypto';
import { MessageOrigin } from './message-origin.vo';
import { TraceContext } from './trace-ctx.vo';

export interface AuditLogProps {
  id: string;
  origin: MessageOrigin;
  trace: TraceContext;
  payload: unknown;
  headers: Record<string, unknown> | null;
  publishedAt: Date | null;
  createdAt: Date;
}

export class AuditLog {
  readonly id: string;
  readonly origin: MessageOrigin;
  readonly trace: TraceContext;
  readonly payload: unknown;
  readonly headers: Record<string, unknown> | null;
  readonly publishedAt: Date | null;
  readonly createdAt: Date;

  private constructor(props: AuditLogProps) {
    this.id = props.id;
    this.origin = props.origin;
    this.trace = props.trace;
    this.payload = props.payload;
    this.headers = props.headers;
    this.publishedAt = props.publishedAt;
    this.createdAt = props.createdAt;
  }

  static create(params: {
    exchange: string;
    routingKey: string;
    messageId?: string | null;
    correlationId?: string | null;
    payload: unknown;
    headers?: Record<string, unknown> | null;
    publishedAt?: Date | null;
  }): AuditLog {
    return new AuditLog({
      id: randomUUID(),
      origin: new MessageOrigin(params.exchange, params.routingKey),
      trace: new TraceContext(params.messageId, params.correlationId),
      payload: params.payload ?? {},
      headers: params.headers ?? null,
      publishedAt: params.publishedAt ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: AuditLogProps): AuditLog {
    return new AuditLog(props);
  }
}
