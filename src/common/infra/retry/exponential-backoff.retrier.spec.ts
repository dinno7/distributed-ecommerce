import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Retrier } from '../../ports/retrier.port';
import { ExponentialBackoffRetrier } from './exponential-backoff.retrier';
import { RetryModule } from './retry.module';

describe('ExponentialBackoffRetrier', () => {
  const retrier = new ExponentialBackoffRetrier();

  afterEach(() => jest.useRealTimers());

  it('doubles the delay between attempts and returns the successful result', async () => {
    jest.useFakeTimers();
    const error = new Error('Connection lost');
    const operation = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('confirmed');

    const result = retrier.run(operation, { maxAttempts: 4, delayMs: 100 });
    for (const [attempt, delay] of [
      [1, 100],
      [2, 200],
      [3, 400],
    ]) {
      await jest.advanceTimersByTimeAsync(delay - 1);
      expect(operation).toHaveBeenCalledTimes(attempt);
      await jest.advanceTimersByTimeAsync(1);
      expect(operation).toHaveBeenCalledTimes(attempt + 1);
    }
    await expect(result).resolves.toBe('confirmed');
  });

  it('caps the delay at the maximum Node timer duration', async () => {
    jest.useFakeTimers();
    const error = new Error('Connection lost');
    const operation = jest.fn<Promise<void>, []>().mockRejectedValue(error);
    const result = retrier.run(operation, {
      maxAttempts: 3,
      delayMs: 2_000_000_000,
    });
    const rejection = expect(result).rejects.toBe(error);

    await jest.advanceTimersByTimeAsync(2_000_000_000);
    await jest.advanceTimersByTimeAsync(2_147_483_646);
    expect(operation).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    await rejection;
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('throws the final error when the attempt limit is reached', async () => {
    const error = new Error('Connection still unavailable');
    const operation = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error('Connection lost'))
      .mockRejectedValue(error);

    await expect(
      retrier.run(operation, { maxAttempts: 2, delayMs: 0 }),
    ).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('throws immediately when the error is not retryable', async () => {
    const error = new Error('Invalid routing key');
    const operation = jest.fn<Promise<void>, []>().mockRejectedValue(error);
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(
      retrier.run(operation, { maxAttempts: 3, delayMs: 0, shouldRetry }),
    ).rejects.toBe(error);
    expect(shouldRetry).toHaveBeenCalledWith(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it.each([
    { maxAttempts: 0, delayMs: 0 },
    { maxAttempts: 1, delayMs: 2_147_483_648 },
  ])(
    'rejects invalid retry options %j before invoking the operation',
    async (options) => {
      const operation = jest.fn<Promise<void>, []>();

      await expect(retrier.run(operation, options)).rejects.toBeInstanceOf(
        RangeError,
      );
      expect(operation).not.toHaveBeenCalled();
    },
  );

  it('exports the Retrier provider to modules that import RetryModule', async () => {
    @Injectable()
    class Consumer {
      constructor(readonly retrier: Retrier) {}
    }

    const module = await Test.createTestingModule({
      imports: [RetryModule],
      providers: [Consumer],
    }).compile();

    try {
      expect(module.get(Consumer).retrier).toBeInstanceOf(
        ExponentialBackoffRetrier,
      );
    } finally {
      await module.close();
    }
  });
});
