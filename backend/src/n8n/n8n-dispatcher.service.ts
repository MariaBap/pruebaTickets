import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EnrichmentStatus } from '../../generated/prisma';

/** Payload que la API envia al webhook de n8n al crear un ticket. */
export interface TicketCreatedPayload {
  ticketId: number;
  title: string;
  description: string;
  createdAt: string;
}

/**
 * Disparo saliente hacia el workflow de n8n.
 *
 * Reglas que sostienen el resto del flujo:
 *  - Se llama DESPUES de que el ticket quedo persistido, nunca dentro de la
 *    misma transaccion: si n8n respondiera antes del commit, el callback
 *    buscaria un ticket que todavia no existe.
 *  - No bloquea la respuesta HTTP al frontend. El ticket se devuelve en
 *    `pending` y el enriquecimiento llega despues.
 *  - No lanza nunca: un fallo de n8n marca el ticket como `failed` y queda en
 *    el log, pero no convierte en error una creacion que si funciono.
 *
 * Este servicio NO clasifica ni deduce nada: solo transporta. La clasificacion
 * vive en el workflow de n8n, como exige el enunciado.
 */
@Injectable()
export class N8nDispatcherService {
  private readonly logger = new Logger(N8nDispatcherService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  dispatch(payload: TicketCreatedPayload): void {
    // Deliberadamente sin await: el handler HTTP no espera a n8n.
    void this.send(payload);
  }

  private async send(payload: TicketCreatedPayload): Promise<void> {
    const url = this.config.getOrThrow<string>('n8n.webhookUrl');
    const timeoutMs = this.config.getOrThrow<number>('n8n.timeoutMs');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`n8n respondió ${response.status} ${response.statusText}`);
      }

      await this.markProcessing(payload.ticketId);
      this.logger.log(`Ticket ${payload.ticketId} despachado a n8n (${response.status})`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo al despachar el ticket ${payload.ticketId} a n8n: ${reason}`);
      await this.markFailed(payload.ticketId);
    }
  }

  /**
   * updateMany con la condicion en el where, no update por id: si el callback
   * de n8n ya llego y dejo el ticket en `done`, esta escritura no debe
   * retrocederlo a `processing`. Con la condicion, simplemente no afecta filas.
   */
  private async markProcessing(ticketId: number): Promise<void> {
    await this.prisma.ticket.updateMany({
      where: { id: ticketId, enrichmentStatus: EnrichmentStatus.pending },
      data: { enrichmentStatus: EnrichmentStatus.processing },
    });
  }

  private async markFailed(ticketId: number): Promise<void> {
    await this.prisma.ticket.updateMany({
      where: {
        id: ticketId,
        enrichmentStatus: { in: [EnrichmentStatus.pending, EnrichmentStatus.processing] },
      },
      data: { enrichmentStatus: EnrichmentStatus.failed },
    });
  }
}
