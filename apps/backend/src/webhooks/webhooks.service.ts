import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrichmentStatus } from '../../generated/prisma';
import { EnrichmentCallbackDto } from './dto/enrichment-callback.dto';

export interface EnrichmentAck {
  ticketId: number;
  enrichmentStatus: EnrichmentStatus;
  enrichedAt: Date;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persiste el resultado del workflow y cierra el ciclo del enriquecimiento.
   *
   * Es idempotente a proposito: n8n reintenta, y un segundo callback sobre el
   * mismo ticket sobrescribe el enriquecimiento y responde 200. Devolver 409 a
   * un reintento legitimo seria peor que aceptar el dato mas reciente.
   */
  async applyEnrichment(dto: EnrichmentCallbackDto): Promise<EnrichmentAck> {
    const exists = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`No existe el ticket ${dto.ticketId}.`);
    }

    const ticket = await this.prisma.ticket.update({
      where: { id: dto.ticketId },
      data: {
        priority: dto.priority,
        category: dto.category,
        tags: dto.tags ?? [],
        suggestedReply: dto.suggestedReply ?? null,
        enrichmentStatus: EnrichmentStatus.done,
        enrichedAt: new Date(),
      },
      select: { id: true, enrichmentStatus: true, enrichedAt: true },
    });

    this.logger.log(
      `Ticket ${ticket.id} enriquecido por n8n: priority=${dto.priority}, category=${dto.category}`,
    );

    return {
      ticketId: ticket.id,
      enrichmentStatus: ticket.enrichmentStatus,
      // enrichedAt acaba de escribirse en esta misma actualizacion.
      enrichedAt: ticket.enrichedAt as Date,
    };
  }
}
