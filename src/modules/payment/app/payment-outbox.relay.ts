import { Logger } from '@nestjs/common';
import { BaseOutboxRelay } from '../../../common/messaging/infra/base-outbox.relay';

export class PaymentOutboxRelay extends BaseOutboxRelay {
  protected readonly logger = new Logger(PaymentOutboxRelay.name);
}
