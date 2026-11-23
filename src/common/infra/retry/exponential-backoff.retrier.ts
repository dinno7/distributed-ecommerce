import { Injectable } from '@nestjs/common';
import type { Retrier, RetryOptions } from '../../ports/retrier.port';

const MAX_TIMER_DELAY_MS = 2_147_483_647;

@Injectable()
export class ExponentialBackoffRetrier implements Retrier {
  async run<T>(
    operation: () => Promise<T>,
    { maxAttempts, delayMs, shouldRetry }: RetryOptions,
  ): Promise<T> {
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
      throw new RangeError(
        'ExponentialBackoffRetrier: maxAttempts must be a positive safe integer',
      );
    }
    if (
      !Number.isInteger(delayMs) ||
      delayMs < 0 ||
      delayMs > MAX_TIMER_DELAY_MS
    ) {
      throw new RangeError(
        'ExponentialBackoffRetrier: delayMs must be an integer between 0 and 2147483647',
      );
    }

    let nextDelayMs = delayMs;
    for (let attempt = 1; ; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts || shouldRetry?.(error) === false) {
          throw error;
        }
        if (nextDelayMs > 0) {
          await new Promise<void>((resolve) =>
            setTimeout(resolve, nextDelayMs),
          );
          nextDelayMs = Math.min(nextDelayMs * 2, MAX_TIMER_DELAY_MS);
        }
      }
    }
  }
}
