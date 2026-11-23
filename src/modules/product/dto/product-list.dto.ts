import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ProductListDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  offset = 0;
}
