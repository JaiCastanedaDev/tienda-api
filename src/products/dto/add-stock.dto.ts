import { IsInt, IsPositive, IsString, IsUUID } from 'class-validator';

export class AddStockDto {
  @IsUUID()
  storeId: string;

  @IsString()
  size: string;

  @IsString()
  color: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
