import { Module } from '@nestjs/common';
import { MessagePublisher } from '../../common/messaging/ports/message-publisher.port';
import { PaymentCheckoutService } from './app/payment-checkout.service';
import { PaymentGatewayRegistry } from './app/payment-gateway.registry';
import { PaymentOutboxRelay } from './app/payment-outbox.relay';
import { PaymentOutboxRepository } from './app/ports/payment-outbox.repository';
import { PaymentRepository } from './app/ports/payment.repository';
import { GetLatestPaymentUC } from './app/usecases/get-latest-payment.uc';
import { GetPaymentUC } from './app/usecases/get-payment.uc';
import { PreparePaymentUC } from './app/usecases/prepare-payment.uc';
import { RetryPaymentUC } from './app/usecases/retry-payment.uc';
import { SettlePaymentUC } from './app/usecases/settle-payment.uc';
import { MockPaymentGateway } from './infra/gateway/mock-payment.gateway';
import { PaymentOutboxRelayRepositoryPrisma } from './infra/persistence/payment-outbox.relay';
import { PaymentOutboxRepositoryPrisma } from './infra/persistence/payment-outbox.repository';
import { PaymentRepositoryPrisma } from './infra/persistence/payment.repository';
import { PaymentController } from './presentation/http/payment.controller';
import { PaymentConsumer } from './presentation/rabbitmq/payment.consumer';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentConsumer,
    PaymentCheckoutService,
    PreparePaymentUC,
    SettlePaymentUC,
    RetryPaymentUC,
    GetPaymentUC,
    GetLatestPaymentUC,
    MockPaymentGateway,
    PaymentOutboxRelayRepositoryPrisma,
    {
      provide: PaymentOutboxRelay,
      inject: [PaymentOutboxRelayRepositoryPrisma, MessagePublisher],
      useFactory: (
        repository: PaymentOutboxRelayRepositoryPrisma,
        publisher: MessagePublisher,
      ) => new PaymentOutboxRelay(repository, publisher),
    },
    {
      provide: PaymentGatewayRegistry,
      inject: [MockPaymentGateway],
      useFactory: (mock: MockPaymentGateway) =>
        new PaymentGatewayRegistry([['mock', mock]]),
    },
    { provide: PaymentRepository, useClass: PaymentRepositoryPrisma },
    {
      provide: PaymentOutboxRepository,
      useClass: PaymentOutboxRepositoryPrisma,
    },
  ],
  exports: [PaymentGatewayRegistry],
})
export class PaymentModule {}
