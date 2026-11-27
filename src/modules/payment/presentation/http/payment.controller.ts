import {
  Body,
  ClassSerializerInterceptor,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';
import { GetLatestPaymentUC } from '../../app/usecases/get-latest-payment.uc';
import { RetryPaymentUC } from '../../app/usecases/retry-payment.uc';
import {
  PaymentAlreadyFinalError,
  PaymentRetryNotEligibleError,
} from '../../domain/payment.entity';
import {
  PaymentDetailsResponseDto,
  PaymentIdResponseDto,
  PaymentResponseDto,
} from './dto/payment-response.dto';
import { GetPaymentUC } from '../../app/usecases/get-payment.uc';
import { MockPaymentCallbackDto } from './dto/mock-payment-callback.dto';
import { SettlePaymentUC } from '../../app/usecases/settle-payment.uc';

@Controller('payments')
@UseInterceptors(ClassSerializerInterceptor)
export class PaymentController {
  constructor(
    private readonly getPayment: GetPaymentUC,
    private readonly getLatestPayment: GetLatestPaymentUC,
    private readonly retryPayment: RetryPaymentUC,
    private readonly settlePayment: SettlePaymentUC,
  ) {}

  @Get()
  @SerializeOptions({ type: PaymentResponseDto })
  async getLatest(@Query('orderId', ParseUUIDPipe) orderId: string) {
    const payment = await this.getLatestPayment.execute(orderId);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  @Get(':paymentId')
  @SerializeOptions({ type: PaymentDetailsResponseDto })
  async get(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    const payment = await this.getPayment.execute(paymentId);
    if (payment.gatewayName !== 'mock')
      throw new NotFoundException('Payment not found');
    return payment;
  }

  @Post(':paymentId/callback')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ type: PaymentDetailsResponseDto })
  async callback(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() payload: MockPaymentCallbackDto,
  ) {
    try {
      return await this.settlePayment.execute({
        paymentId,
        gatewayName: 'mock',
        payload,
      });
    } catch (error) {
      if (error instanceof PaymentAlreadyFinalError) {
        throw new ConflictException(error.message, {
          errorCode: 'PAYMENT_ALREADY_FINAL',
          cause: error,
        });
      }
      throw error;
    }
  }

  @Post(':paymentId/retry')
  @SerializeOptions({ type: PaymentIdResponseDto })
  async retry(@Param('paymentId', ParseUUIDPipe) paymentId: string) {
    try {
      return await this.retryPayment.execute(paymentId);
    } catch (error) {
      if (error instanceof PaymentRetryNotEligibleError) {
        throw new ConflictException(error.message, {
          errorCode: 'PAYMENT_RETRY_NOT_ELIGIBLE',
          cause: error,
        });
      }
      throw error;
    }
  }
}
