import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class AiInsightsDto {
  /**
   * Historial a usar para análisis (por defecto 30 días).
   */
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(365)
  days?: number;
}
