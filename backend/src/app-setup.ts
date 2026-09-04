import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Configuración global de la aplicación.
 *
 * Vive aparte de `main.ts` para que los tests e2e levanten la app con
 * exactamente los mismos pipes y filtros que producción. Si esto se duplicara,
 * un test podría pasar contra un comportamiento que la app real no tiene.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      // Descarta propiedades no declaradas en el DTO y rechaza la petición si
      // vienen: evita que un cliente intente colar campos como `role` o
      // `enrichmentStatus` en un payload que no los contempla.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
