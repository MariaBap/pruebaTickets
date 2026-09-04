import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { WebhooksService, EnrichmentAck } from './webhooks.service';
import { EnrichmentCallbackDto } from './dto/enrichment-callback.dto';
import { WebhookSecretGuard } from './guards/webhook-secret.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('webhooks/n8n')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  /**
   * Callback del workflow de n8n.
   *
   * @Public() saca esta ruta del guard de JWT (n8n no tiene sesion de usuario)
   * y a cambio queda protegida por el secreto compartido en cabecera. Las dos
   * cosas van juntas: quitar el guard sin poner el otro dejaria el endpoint
   * abierto a cualquiera.
   */
  @Public()
  @UseGuards(WebhookSecretGuard)
  @Post('enrichment')
  @HttpCode(HttpStatus.OK)
  enrichment(@Body() dto: EnrichmentCallbackDto): Promise<EnrichmentAck> {
    return this.webhooks.applyEnrichment(dto);
  }
}
