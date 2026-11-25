import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import appConfig, { validate } from './env.validate';
import { ProductModule } from './modules/product/product.module';
import { PersistenceModule } from './common';
import { OrderModule } from './modules/order/order.module';
import { IdempotencyModule } from '@nestjs/idempotency';
import { PrismaIdempotencyStore } from './common';

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
    PersistenceModule,
    ProductModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [PrismaIdempotencyStore],
})
export class AppModule {}
