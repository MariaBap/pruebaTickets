import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString({ message: 'El nombre es obligatorio.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsEmail({}, { message: 'El email no tiene un formato valido.' })
  @MaxLength(180, { message: 'El email no puede superar los 180 caracteres.' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contrasena no puede superar los 72 caracteres.' })
  @Matches(/[A-Za-z]/, { message: 'La contrasena debe incluir al menos una letra.' })
  @Matches(/\d/, { message: 'La contrasena debe incluir al menos un numero.' })
  password!: string;
}
