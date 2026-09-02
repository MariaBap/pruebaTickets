import { IsInt, IsOptional, IsString, MaxLength, MinLength, IsPositive } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Solo title, description y (opcionalmente) el asignado.
 *
 * Los campos de enriquecimiento (priority, category, tags, suggestedReply)
 * NO estan aqui a proposito: los produce el workflow de n8n y entran por el
 * callback. Con whitelist + forbidNonWhitelisted, mandarlos da 400.
 * `status` tampoco: un ticket nace siempre en `open`.
 */
export class CreateTicketDto {
  @IsString({ message: 'El titulo es obligatorio.' })
  @MinLength(5, { message: 'El titulo debe tener al menos 5 caracteres.' })
  @MaxLength(200, { message: 'El titulo no puede superar los 200 caracteres.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  title!: string;

  @IsString({ message: 'La descripcion es obligatoria.' })
  @MinLength(10, { message: 'La descripcion debe tener al menos 10 caracteres.' })
  @MaxLength(5000, { message: 'La descripcion no puede superar los 5000 caracteres.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description!: string;

  @IsOptional()
  @IsInt({ message: 'El asignado debe ser el id de un usuario.' })
  @IsPositive({ message: 'El asignado debe ser el id de un usuario.' })
  assignedToId?: number;
}
