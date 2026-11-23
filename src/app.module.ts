import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import appConfig, { validate } from './config';
import { ProductModule } from './modules/product/product.module';
import { PersistenceModule } from './common';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    PersistenceModule,
    ProductModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
