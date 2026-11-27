import { Exclude, Expose, Transform } from 'class-transformer';
import type {
  PaymentFailureCode,
  PaymentStatus,
} from '../../../domain/payment.entity';

@Exclude()
export class PaymentIdResponseDto {
  @Expose()
  @Transform(({ obj, value }) => obj.id ?? value, { toClassOnly: true })
  paymentId: string | null;
}

@Exclude()
export class PaymentResponseDto extends PaymentIdResponseDto {
  @Expose()
  status: PaymentStatus | 'PENDING';

  @Expose()
  checkoutUrl: string | null;

  @Expose()
  @Transform(({ obj, value }) => (obj.amount?.minorUnits ?? value).toString(), {
    toClassOnly: true,
  })
  amountMinor: string;

  @Expose()
  @Transform(({ obj, value }) => obj.amount?.currency ?? value, {
    toClassOnly: true,
  })
  currency: string;

  @Expose()
  @Transform(({ value }) => value ?? undefined, { toClassOnly: true })
  failureCode?: PaymentFailureCode;
}

@Exclude()
export class PaymentDetailsResponseDto extends PaymentResponseDto {
  @Expose()
  orderId: string;
}
