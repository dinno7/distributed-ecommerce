import { Injectable, Logger } from '@nestjs/common';
import { BaseOutboxRelay } from '../../../common/messaging/infra/base-outbox.relay';
import { MessagePublisher } from '../../../common/messaging/ports/message-publisher.port';
import { OutboxRelayRepository } from '../../../common/messaging/ports/outbox.repositor';

@Injectable()
export class OrderOutboxService extends BaseOutboxRelay {
  protected readonly logger: Logger = new Logger(OrderOutboxService.name);

  constructor(outboxRepo: OutboxRelayRepository, publisher: MessagePublisher) {
    super(outboxRepo, publisher);
  }
}
