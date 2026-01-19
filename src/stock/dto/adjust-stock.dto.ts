import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AdjustStockDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsUUID()
  productVariantId: string;

  @IsInt()
  quantity: number; // puede ser positivo o negativo

  @IsNotEmpty()
  @IsString()
  reason: string;
}
