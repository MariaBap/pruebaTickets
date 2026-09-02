import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsPositive,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TicketStatus } from '../../../generated/prisma';

/**
 * Campos que puede tocar una persona. El enriquecimiento sigue fuera: lo
 * escribe unicamente el callback de n8n.
 * `assignedToId` acepta null explicito para desasignar.
 */
export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'El titulo debe tener al menos 5 caracteres.' })
  @MaxLength(200, { message: 'El titulo no puede superar los 200 caracteres.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'La descripcion debe tener al menos 10 caracteres.' })
  @MaxLength(5000, { message: 'La descripcion no puede superar los 5000 caracteres.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsEnum(TicketStatus, {
    message: `status debe ser uno de: ${Object.values(TicketStatus).join(', ')}.`,
  })
  status?: TicketStatus;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsInt({ message: 'El asignado debe ser el id de un usuario o null.' })
  @IsPositive({ message: 'El asignado debe ser el id de un usuario o null.' })
  assignedToId?: number | null;
}
