export interface RetryOptions {
  /** Total attempts, including the initial call. */
  maxAttempts: number;
  /** Initial retry delay in milliseconds. Doubles after each wait, up to Node's timer limit. */
  delayMs: number;
  shouldRetry?: (error: unknown) => boolean;
}

export abstract class Retrier {
  abstract run<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
  ): Promise<T>;
}
