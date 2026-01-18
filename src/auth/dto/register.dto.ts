import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsOptional()
  @IsString()
  tenantName?: string; // Nombre de la tienda (opcional, para crear una nueva)

  @IsOptional()
  @IsEnum(['OWNER', 'SELLER'])
  role?: 'OWNER' | 'SELLER';
}
