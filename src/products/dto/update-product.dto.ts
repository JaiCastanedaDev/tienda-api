import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductVariantDto {
  @IsString()
  @IsNotEmpty()
  size: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  /**
   * Cantidad final deseada de stock para esta variante (no un delta).
   */
  @IsInt()
  @Min(0)
  quantity: number;
}

/**
 * @deprecated Este DTO se usaba para un update completo (incluyendo variantes/stock).
 * Ahora la edición de producto (PUT /products/:id) solo permite metadata.
 * Usa `UpdateProductMetadataDto`.
 */
export class UpdateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto)
  variants?: UpdateProductVariantDto[];
}
