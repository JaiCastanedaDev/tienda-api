import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AiChatDto {
  @IsString()
  @MaxLength(2000)
  message!: string;

  /**
   * Si quieres pasar instrucciones extra (ej: "enfócate en ropa deportiva").
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  context?: string;
}
