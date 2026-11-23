import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  private page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  private per_page = 10;

  get take(): number {
    return this.per_page;
  }

  get skip(): number {
    return (this.page - 1) * this.per_page;
  }
}
