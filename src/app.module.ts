import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
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
import { Request, Response } from 'express';
import { MessagingModule } from './common/messaging/messaging.module';

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
  ],
  controllers: [AppController],
  providers: [PrismaIdempotencyStore],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((_req: Request, res: Response) => {
        return res.redirect('/docs');
      })
      .forRoutes({
        method: RequestMethod.GET,
        path: '/',
      });
  }
}
