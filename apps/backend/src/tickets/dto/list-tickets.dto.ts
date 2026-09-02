import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  EnrichmentStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../../generated/prisma';

export const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'priority'] as const;
export type SortableField = (typeof SORTABLE_FIELDS)[number];

export class ListTicketsQueryDto {
  // --- Filtros --------------------------------------------------------------
  @IsOptional()
  @IsEnum(TicketStatus, {
    message: `status debe ser uno de: ${Object.values(TicketStatus).join(', ')}.`,
  })
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority, {
    message: `priority debe ser uno de: ${Object.values(TicketPriority).join(', ')}.`,
  })
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketCategory, {
    message: `category debe ser uno de: ${Object.values(TicketCategory).join(', ')}.`,
  })
  category?: TicketCategory;

  @IsOptional()
  @IsEnum(EnrichmentStatus, {
    message: `enrichmentStatus debe ser uno de: ${Object.values(EnrichmentStatus).join(', ')}.`,
  })
  enrichmentStatus?: EnrichmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'assignedToId debe ser el id de un usuario.' })
  assignedToId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'createdById debe ser el id de un usuario.' })
  createdById?: number;

  // --- Busqueda por texto ---------------------------------------------------
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'La busqueda no puede superar los 200 caracteres.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  // --- Paginacion -----------------------------------------------------------
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'page debe ser mayor o igual a 1.' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit debe estar entre 1 y 100.' })
  @Max(100, { message: 'limit debe estar entre 1 y 100.' })
  limit: number = 10;

  // --- Ordenamiento ---------------------------------------------------------
  @IsOptional()
  @IsEnum(SORTABLE_FIELDS, {
    message: `sortBy debe ser uno de: ${SORTABLE_FIELDS.join(', ')}.`,
  })
  sortBy: SortableField = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: "sortOrder debe ser 'asc' o 'desc'." })
  sortOrder: 'asc' | 'desc' = 'desc';
}

export interface PaginatedTickets<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
