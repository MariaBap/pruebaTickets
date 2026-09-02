import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string>('corsOrigin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Descarta propiedades no declaradas en el DTO y rechaza la peticion si
      // vienen: evita que un cliente intente colar campos como `role` o
      // `enrichmentStatus` en un payload que no los contempla.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = config.getOrThrow<number>('port');
  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(`API escuchando en http://localhost:${port}/api`);
}

void bootstrap();
