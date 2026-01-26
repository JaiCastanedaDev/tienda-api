import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

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
}
