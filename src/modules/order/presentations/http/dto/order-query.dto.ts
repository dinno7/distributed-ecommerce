import { IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { PaginationDto } from '../../../../../common/dto/pagination.dto';
import { OrderStatus } from '../../../domain/order.entity';

export class OrderListDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}

export class RetryOrderDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  itemId?: string;
}
