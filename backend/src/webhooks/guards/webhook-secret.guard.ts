import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

export const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

/**
 * Protege el callback de n8n con un secreto compartido en cabecera.
 *
 * Rechaza con 401 y un mensaje generico: no distingue entre "falta la
 * cabecera" y "el secreto no coincide", para no darle pistas a quien sondea.
 */
@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[WEBHOOK_SECRET_HEADER];
    const expected = this.config.getOrThrow<string>('n8n.webhookSecret');

    if (typeof provided !== 'string' || !this.matches(provided, expected)) {
      throw new UnauthorizedException('No autorizado.');
    }

    return true;
  }

  /**
   * Comparacion en tiempo constante. Una comparacion con === termina en el
   * primer caracter distinto, y esa diferencia de tiempo permite adivinar el
   * secreto byte a byte.
   */
  private matches(provided: string, expected: string): boolean {
    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(expected, 'utf8');

    // timingSafeEqual exige la misma longitud; comparar longitudes por separado
    // solo filtra el tamano del secreto, no su contenido.
    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  }
}
