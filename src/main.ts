import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { configureHttp } from './http.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureHttp(app);
  app.enableShutdownHooks(); // runs onModuleDestroy → $disconnect db

  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow<number>('app.port'));
}
void bootstrap();
