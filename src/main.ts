import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/infra/interceptors/response.interceptor';
import { PrismaExceptionFilter } from './common/infra/exception-filters/prisma-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks(); // runs onModuleDestroy → $disconnect db

  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow<number>('app.port'));
}
void bootstrap();
