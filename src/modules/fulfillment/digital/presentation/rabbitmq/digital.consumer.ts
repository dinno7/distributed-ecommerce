import { Injectable } from '@nestjs/common';
import { EXCHANGES } from '../../../../../common/contracts/exchanges';
import type { FulfillmentCommandPayload } from '../../../../../common/contracts/messages';
import { QUEUES } from '../../../../../common/contracts/queues';
import { ROUTING_KEYS } from '../../../../../common/contracts/routing-keys';
import { RabbitRetrieableSubscriber } from '../../../../../common/messaging/infra/retrier-error-handler';
import { validateFulfillmentCommand } from '../../../presentation/rabbitmq/fulfillment-command.validation';
import { GrantDigitalUC } from '../../app/usecases/digital.use-case';

@Injectable()
export class DigitalConsumer {
  constructor(private readonly useCase: GrantDigitalUC) {}

  @RabbitRetrieableSubscriber({
    exchange: EXCHANGES.MAIN,
    routingKey: ROUTING_KEYS.GrantDigital,
    queue: QUEUES.FulfillDigital,
  })
  async consume(payload: FulfillmentCommandPayload): Promise<void> {
    validateFulfillmentCommand(payload);
    await this.useCase.execute(payload);
  }
}
