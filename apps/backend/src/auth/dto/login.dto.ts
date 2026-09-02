import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'El email no tiene un formato valido.' })
  @MaxLength(180)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString({ message: 'La contrasena es obligatoria.' })
  @MinLength(1, { message: 'La contrasena es obligatoria.' })
  @MaxLength(72)
  password!: string;
}
