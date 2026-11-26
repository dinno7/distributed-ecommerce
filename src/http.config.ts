import {
  type INestApplication,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { PrismaExceptionFilter } from './common/infra/exception-filters/prisma-exception.filter';
import { ResponseInterceptor } from './common/infra/interceptors/response.interceptor';

export function configureHttp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });
  app.enableVersioning({ defaultVersion: '1', type: VersioningType.URI });
}
