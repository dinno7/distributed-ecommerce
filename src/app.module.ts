import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import appConfig, { validate } from './env.validate';
import { ProductModule } from './modules/product/product.module';
import { PersistenceModule } from './common';
import { OrderModule } from './modules/order/order.module';
import { IdempotencyModule } from '@nestjs/idempotency';
import { PrismaIdempotencyStore } from './common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MessagingModule } from './common/messaging/messaging.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    IdempotencyModule.forRoot({
      scope: false,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      serveStaticOptions: {
        fallthrough: false,
      },
    }),
    MessagingModule,
    PersistenceModule,
    ProductModule,
    OrderModule,
    PaymentModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [PrismaIdempotencyStore],
})
export class AppModule {}
