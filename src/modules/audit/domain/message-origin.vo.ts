export class MessageOrigin {
  readonly exchange: string;
  readonly routingKey: string;

  constructor(exchange: string, routingKey: string) {
    if (!exchange?.trim()) {
      throw new Error('MessageOrigin requires a non-empty exchange');
    }

    this.exchange = exchange.trim();
    this.routingKey = routingKey ?? '';
    Object.freeze(this);
  }

  equals(other: MessageOrigin): boolean {
    return (
      this.exchange === other.exchange && this.routingKey === other.routingKey
    );
  }
}
