import { Injectable, Logger } from '@nestjs/common';
import { BaseOutboxRelay } from '../../../common/messaging/infra/base-outbox.relay';
import { MessagePublisher } from '../../../common/messaging/ports/message-publisher.port';
import { OutboxRelayRepository } from '../../../common/messaging/ports/outbox.repositor';

@Injectable()
export class OrderOutboxRelay extends BaseOutboxRelay {
  protected readonly logger: Logger = new Logger(OrderOutboxRelay.name);

  constructor(outboxRepo: OutboxRelayRepository, publisher: MessagePublisher) {
    super(outboxRepo, publisher);
  }
}
