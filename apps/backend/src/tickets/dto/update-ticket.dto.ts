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
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres.' })
  @MaxLength(150, { message: 'El título no puede superar los 150 caracteres.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres.' })
  @MaxLength(3000, { message: 'La descripción no puede superar los 3000 caracteres.' })
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
