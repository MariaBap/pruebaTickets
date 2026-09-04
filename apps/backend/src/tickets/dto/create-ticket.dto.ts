import { IsInt, IsOptional, IsString, MaxLength, MinLength, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';
import { HasMeaningfulText } from '../../common/validators/has-meaningful-text.validator';

/**
 * Solo title, description y (opcionalmente) el asignado.
 *
 * Los campos de enriquecimiento (priority, category, tags, suggestedReply)
 * NO estan aqui a proposito: los produce el workflow de n8n y entran por el
 * callback. Con whitelist + forbidNonWhitelisted, mandarlos da 400.
 * `status` tampoco: un ticket nace siempre en `open`.
 */
export class CreateTicketDto {
  @IsString({ message: 'El título es obligatorio.' })
  @MinLength(10, { message: 'El título debe tener al menos 10 caracteres.' })
  @MaxLength(150, { message: 'El título no puede superar los 150 caracteres.' })
  @HasMeaningfulText({
    message: 'El título debe incluir texto, no solo números, espacios o símbolos.',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsString({ message: 'La descripción es obligatoria.' })
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres.' })
  @MaxLength(3000, { message: 'La descripción no puede superar los 3000 caracteres.' })
  @HasMeaningfulText({
    message: 'La descripción debe incluir texto, no solo números, espacios o símbolos.',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description!: string;

  @IsOptional()
  @IsInt({ message: 'El asignado debe ser el id de un usuario.' })
  @IsPositive({ message: 'El asignado debe ser el id de un usuario.' })
  assignedToId?: number;
}
