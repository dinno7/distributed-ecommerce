import {
  IsEnum,
  IsInt,
  IsObject,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ProductType } from '../entities/product.entity';
import { type JsonObject } from '../../../common';

export class CreateProductDto {
  @IsString()
  @Matches(/\S/)
  name: string;

  @IsEnum(ProductType)
  type: ProductType;

  @Matches(/^\d{1,19}$/)
  unitPriceMinor: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  subscriptionDays?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  digitalMetadata?: JsonObject;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  initialStock?: number;
}
