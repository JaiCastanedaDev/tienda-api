import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class DashboardMetricsQueryDto {
  /**
   * Mes (1-12). Si no se envía, se usa el mes actual.
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  /**
   * Año. Si no se envía, se usa el año actual.
   */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(2025)
  @Max(2100)
  year?: number;
}
