import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsObject,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { CreateOrderInput } from '../../../app/usecases/create-order.uc';

class CreateOrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}

export class CreateOrderDto implements CreateOrderInput {
  @IsUUID()
  customerId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayUnique(
    (item: CreateOrderItemDto | null) =>
      typeof item?.productId === 'string' ? item.productId.toLowerCase() : item,
    { message: 'items must contain distinct products' },
  )
  items: CreateOrderItemDto[];
}
