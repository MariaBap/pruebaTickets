import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TicketCategory, TicketPriority } from '../../../generated/prisma';

/**
 * Resultado del workflow de n8n.
 *
 * `suggestedReply` se acepta pero el workflow de esta entrega no lo produce:
 * la respuesta sugerida solo tendria sentido con el nodo de IA, que es un
 * bonus opcional que no se implemento. Se mantiene opcional para no convertir
 * en 400 un payload que si lo incluya.
 */
export class EnrichmentCallbackDto {
  @IsInt({ message: 'ticketId debe ser un entero.' })
  @IsPositive({ message: 'ticketId debe ser un entero positivo.' })
  ticketId!: number;

  @IsEnum(TicketPriority, {
    message: `priority debe ser uno de: ${Object.values(TicketPriority).join(', ')}.`,
  })
  priority!: TicketPriority;

  @IsEnum(TicketCategory, {
    message: `category debe ser uno de: ${Object.values(TicketCategory).join(', ')}.`,
  })
  category!: TicketCategory;

  @IsOptional()
  @IsArray({ message: 'tags debe ser una lista de strings.' })
  @ArrayMaxSize(20, { message: 'tags no puede tener mas de 20 elementos.' })
  @IsString({ each: true, message: 'cada tag debe ser un string.' })
  @MaxLength(40, { each: true, message: 'cada tag no puede superar los 40 caracteres.' })
  tags?: string[];

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString({ message: 'suggestedReply debe ser texto.' })
  @MaxLength(2000, { message: 'suggestedReply no puede superar los 2000 caracteres.' })
  suggestedReply?: string | null;
}
