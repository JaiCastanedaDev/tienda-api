import { IsInt, IsPositive, IsString } from 'class-validator';

export class AddStockDto {
  @IsString()
  size: string;

  @IsString()
  color: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
