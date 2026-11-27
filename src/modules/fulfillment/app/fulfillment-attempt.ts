import { Injectable } from '@nestjs/common';
import type { FulfillmentItemMessage } from '../../../common/contracts/messages';
import { EventMessage } from '../../../common/domain/value-objects/event-message.vo';
import {
  TransactionManager,
  type TransactionCtx,
} from '../../../common/ports/transaction.port';

export abstract class FulfillmentStore {
  abstract claim(
    item: FulfillmentItemMessage,
    tx: TransactionCtx,
  ): Promise<boolean>;
  abstract finish(
    item: FulfillmentItemMessage,
    errorCode: string | null,
    tx: TransactionCtx,
  ): Promise<void>;
  abstract stage(
    event: EventMessage<FulfillmentItemMessage>,
    tx: TransactionCtx,
  ): Promise<void>;
}

type EffectResult = {
  errorCode?: string;
  events?: EventMessage<FulfillmentItemMessage>[];
};

@Injectable()
export class FulfillmentAttemptRunner {
  constructor(
    private readonly transactions: TransactionManager,
    private readonly store: FulfillmentStore,
  ) {}

  async run(
    { orderId, orderItemId, attemptNo }: FulfillmentItemMessage,
    routes: { started: string; succeeded: string; failed: string },
    apply: (tx: TransactionCtx) => Promise<EffectResult>,
  ): Promise<void> {
    const item = { orderId, orderItemId, attemptNo };
    await this.transactions.run(async (tx) => {
      if (!(await this.store.claim(item, tx))) return;

      await this.store.stage(new EventMessage(item, routes.started), tx);
      const result = await apply(tx);
      const errorCode = result.errorCode ?? null;
      await this.store.finish(item, errorCode, tx);
      for (const event of result.events ?? [])
        await this.store.stage(event, tx);
      const outcome = errorCode ? { ...item, errorCode } : item;
      await this.store.stage(
        new EventMessage(outcome, errorCode ? routes.failed : routes.succeeded),
        tx,
      );
    });
  }
}
