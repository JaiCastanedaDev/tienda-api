import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class SetStockDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsUUID()
  productVariantId: string;

  @IsInt()
  @Min(0)
  quantity: number;

  @IsNotEmpty()
  @IsString()
  reason: string;
}
