import { Logger } from '@nestjs/common';
import { Channel, ConsumeMessage } from 'amqplib';
import { EXCHANGES } from '../../contracts/exchanges';
import { MESSAGING_HEADERS } from '../../contracts/headers';
import { RetryQueues } from '../../contracts/queues';

export class NonRetryableError extends Error {}

interface RetryHandlerOptions {
  isPermanentError?: (error: unknown) => boolean;
}

export function createRetryErrorHandler(
  queueName: string,
  options: RetryHandlerOptions = {},
) {
  const logger = new Logger(`MessageRetryErrorHandler:${queueName}`);
  const queueConfig = RetryQueues.find((q) => q.queueName === queueName);

  if (!queueConfig) {
    throw new Error(`Queue "${queueName}" is not registered in RetryQueues`);
  }

  const maxRetries = queueConfig.ttlSeconds.length;
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
