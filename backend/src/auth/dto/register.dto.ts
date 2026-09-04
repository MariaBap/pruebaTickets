import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * CrazySupportHub es una herramienta interna: las cuentas pertenecen al
 * dominio de la organización. La comprobación vive aquí y no solo en el
 * formulario, porque una validación que solo existe en el navegador se salta
 * con cualquier cliente HTTP.
 */
export const ALLOWED_EMAIL_DOMAIN = '@crazysupporthub.test';

// Los puntos se escapan: sin eso, `.` casaría con cualquier carácter y
// "@crazysupporthubXtest" pasaría por válido.
const ALLOWED_EMAIL_PATTERN = new RegExp(`${ALLOWED_EMAIL_DOMAIN.replace(/[.]/g, '\\.')}$`, 'i');

export class RegisterDto {
  @IsString({ message: 'El nombre es obligatorio.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsEmail({}, { message: 'Dirección de correo inválida' })
  @MaxLength(180, { message: 'El correo no puede superar los 180 caracteres.' })
  @Matches(ALLOWED_EMAIL_PATTERN, { message: 'Dirección de correo inválida' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @MaxLength(72, { message: 'La contraseña no puede superar los 72 caracteres.' })
  @Matches(/[A-Za-z]/, { message: 'La contraseña debe incluir al menos una letra.' })
  @Matches(/\d/, { message: 'La contraseña debe incluir al menos un número.' })
  password!: string;
}
