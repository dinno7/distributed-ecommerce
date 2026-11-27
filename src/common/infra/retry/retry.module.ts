import { Module } from '@nestjs/common';
import { Retrier } from '../../ports/retrier.port';
import { ExponentialBackoffRetrier } from './exponential-backoff.retrier';

@Module({
  providers: [{ provide: Retrier, useClass: ExponentialBackoffRetrier }],
  exports: [Retrier],
})
export class RetryModule {}
