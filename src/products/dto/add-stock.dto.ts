import { IsInt, IsPositive, IsString, IsUUID } from 'class-validator';

export class AddStockDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  size: string;

  @IsString()
  color: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
