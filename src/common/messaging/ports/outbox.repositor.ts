export interface OutboxRecord {
  id: string;
  routingKey: string;
  occurredAt: Date;
  payload: unknown;
}

export abstract class OutboxRelayRepository {
  abstract claimBatch(limit: number): Promise<OutboxRecord[]>;
  abstract markPublished(id: string): Promise<void>;
  abstract markFailed(id: string, retryAfterMs: number): Promise<void>;
}
