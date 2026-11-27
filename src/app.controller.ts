import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaService } from './common/infra/persistence/prisma.service';

@Controller({
  version: VERSION_NEUTRAL,
})
export class AppController {
  constructor(
    private readonly healthChecks: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    private readonly prisma: PrismaService,
    private readonly rabbitmq: AmqpConnection,
  ) {}

  @Get('ping')
  ping(): string {
    return 'pong';
  }

  @Get('health')
  @HealthCheck()
  health() {
    return this.healthChecks.check([
      this.indicators
        .check('postgres')
        .attempt(async () => {
          try {
            await this.prisma.$queryRaw`SELECT 1`;
          } catch {
            throw new Error('PostgreSQL probe failed');
          }
        })
        .withTimeout('1s'),
      () => {
        const rabbitmq = this.indicators.check('rabbitmq');
        return this.rabbitmq.connected ? rabbitmq.up() : rabbitmq.down();
      },
    ]);
  }
}
