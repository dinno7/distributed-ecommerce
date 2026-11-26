import { applyDecorators, Logger } from '@nestjs/common';
import { Channel, ConsumeMessage } from 'amqplib';
import { EXCHANGES } from '../../contracts/exchanges';
import { MESSAGING_HEADERS } from '../../contracts/headers';
import {
  RabbitHandlerConfig,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';

export class NonRetryableError extends Error {}

interface RetryHandlerOptions {
  maxRetries?: number;
  isPermanentError?: (error: unknown) => boolean;
}

export function createRetryErrorHandler(
  queueName: string,
  options: RetryHandlerOptions = {},
) {
  const logger = new Logger(`MessageRetryErrorHandler:${queueName}`);

  const maxRetries = options.maxRetries ?? 3;
  const isPermanentError =
    options.isPermanentError ?? ((err) => err instanceof NonRetryableError);

  return (channel: Channel, msg: ConsumeMessage, error: unknown): void => {
    const errorMessage = error instanceof Error ? error.message : String(error);

    try {
      const headers = msg.properties.headers ?? {};
      const parsedRetry = Number(headers[MESSAGING_HEADERS.RETRY_COUNT]);
      const currentRetry =
        Number.isFinite(parsedRetry) && parsedRetry >= 0 ? parsedRetry : 0;

      // Strip per-message expiration so retry TTLs and DLQ retention aren't overridden
      const { expiration: _ignoredExpiration, ...safeProperties } =
        msg.properties;

      const isPermanent = isPermanentError(error);

      if (isPermanent || currentRetry >= maxRetries) {
        logger.error(
          `Sending message to ${queueName}.dlq (retry ${currentRetry}/${maxRetries}, permanent=${isPermanent}): ${errorMessage}`,
        );

        channel.publish(EXCHANGES.DLX, `${queueName}.dlq`, msg.content, {
          ...safeProperties,
          deliveryMode: 2,
          headers: {
            ...headers,
            [MESSAGING_HEADERS.RETRY_COUNT]: currentRetry,
            [MESSAGING_HEADERS.FINAL_ERROR]: errorMessage,
          },
        });
        channel.ack(msg);
        return;
      }

      const nextRetry = currentRetry + 1;
      logger.warn(
        `Retrying message on ${queueName}.retry.${nextRetry} (${nextRetry}/${maxRetries}): ${errorMessage}`,
      );

      channel.publish(
        EXCHANGES.RETRY,
        `${queueName}.retry.${nextRetry}`,
        msg.content,
        {
          ...safeProperties,
          deliveryMode: 2,
          headers: {
            ...headers,
            [MESSAGING_HEADERS.RETRY_COUNT]: nextRetry,
            [MESSAGING_HEADERS.LAST_ERROR]: errorMessage,
          },
        },
      );
      channel.ack(msg);
    } catch (handlerError) {
      logger.error(
        `RetryErrorHandler failed for ${queueName}; falling back to nack(false): ${
          handlerError instanceof Error
            ? handlerError.message
            : String(handlerError)
        }`,
      );
      channel.nack(msg, false, false);
    }
  };
}

export function quorumRetryErrorHandler(
  channel: Channel,
  msg: ConsumeMessage,
  error: unknown,
): void {
  // Permanent domain/validation failures -> skip retries, go straight to DLQ
  if (error instanceof NonRetryableError) {
    channel.reject(msg, false);
    return;
  }

  // Transient failures -> requeue via basic.reject so RabbitMQ 4.4:
  // 1. Increments delivery-count
  // 2. Holds message for min(x-delayed-retry-min * delivery-count, x-delayed-retry-max)
  // 3. Dead-letters to app.dlx once delivery-count exceeds x-delivery-limit
  channel.reject(msg, true);
}

export function RabbitRetrieableSubscriber(
  options: Omit<RabbitHandlerConfig, 'type'> & {
    queue: string; // Make it require
    maxRetriesCount?: number;
    delayMs?: number;
  },
) {
  options.maxRetriesCount ??= 3;
  options.delayMs ??= 5_000;
  const additionalOptions = {
    errorHandler: quorumRetryErrorHandler,
    queueOptions: {
      ...(options?.queueOptions ? options.queueOptions : {}),
      arguments: {
        ...(options?.queueOptions?.arguments
          ? options.queueOptions.arguments
          : {}),
        'x-queue-type': 'quorum',
        'x-delayed-retry-type': 'all',
        'x-dead-letter-strategy': 'at-least-once',
        'x-delayed-retry-min': options.delayMs, // 5s -> 10s -> 15s (linear backoff)
        'x-delayed-retry-max': options.delayMs * 12, // Cap at this
        'x-delivery-limit': options.maxRetriesCount, // Route to DLX after this
        'x-dead-letter-exchange': EXCHANGES.DLX,
        'x-dead-letter-routing-key': `${options.queue}.dlq`,
      },
    },
  };

  const finalOpts: RabbitHandlerConfig = {
    ...options,
    ...additionalOptions,
    type: 'subscribe',
  };

  return applyDecorators(RabbitSubscribe(finalOpts));
}
