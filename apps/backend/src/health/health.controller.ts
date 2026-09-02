import { Controller, Get } from '@nestjs/common';

/**
 * Endpoint de salud. Lo usa el healthcheck de docker-compose para saber
 * cuando la API esta lista y no arrancar el frontend antes de tiempo.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'crazysupporthub-api',
      timestamp: new Date().toISOString(),
    };
  }
}
