import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const maxPageSize = 100;

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1 + Math.floor(2_147_483_647 / maxPageSize))
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(maxPageSize)
  per_page = 10;

  get take(): number {
    return this.per_page;
  }

  get skip(): number {
    return (this.page - 1) * this.per_page;
  }
}
