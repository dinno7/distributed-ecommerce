export class TraceContext {
  readonly messageId: string | null;
  readonly correlationId: string | null;

  constructor(messageId?: string | null, correlationId?: string | null) {
    this.messageId = messageId?.trim() || null;
    this.correlationId = correlationId?.trim() || null;
    Object.freeze(this);
  }

  equals(other: TraceContext): boolean {
    return (
      this.messageId === other.messageId &&
      this.correlationId === other.correlationId
    );
  }
}
