import { BadRequestException, NotFoundException } from '@nestjs/common';

export const ProductErrors = {
  subscriptionDaysRequired: () =>
    new BadRequestException('Subscriptions require subscriptionDays', {
      errorCode: 'PRODUCT_SUBSCRIPTION_DAYS_REQUIRED',
    }),
  subscriptionDaysNotAllowed: () =>
    new BadRequestException(
      'subscriptionDays is only valid for subscriptions',
      {
        errorCode: 'PRODUCT_SUBSCRIPTION_DAYS_NOT_ALLOWED',
      },
    ),
  digitalMetadataNotAllowed: () =>
    new BadRequestException(
      'digitalMetadata is only valid for digital products',
      {
        errorCode: 'PRODUCT_DIGITAL_METADATA_NOT_ALLOWED',
      },
    ),
  initialStockNotAllowed: () =>
    new BadRequestException(
      'initialStock is only valid for physical products',
      {
        errorCode: 'PRODUCT_INITIAL_STOCK_NOT_ALLOWED',
      },
    ),
  invalidUnitPrice: (cause: unknown) =>
    new BadRequestException(
      'unitPriceMinor must be a nonnegative 64-bit integer',
      {
        errorCode: 'PRODUCT_INVALID_UNIT_PRICE',
        cause,
      },
    ),
  notFound: (cause?: unknown) =>
    new NotFoundException('Product not found', {
      errorCode: 'PRODUCT_NOT_FOUND',
      cause,
    }),
} as const;
