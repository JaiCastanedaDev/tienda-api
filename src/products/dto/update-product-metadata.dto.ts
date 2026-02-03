import {
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateVariantImageDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * Update de metadata del producto (NO stock).
 *
 * Este DTO existe para separar la edición de catálogo (name/sku/price)
 * de los ajustes de inventario.
 */
export class UpdateProductMetadataDto {
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
  @Type(() => UpdateVariantImageDto)
  images?: UpdateVariantImageDto[];
}
