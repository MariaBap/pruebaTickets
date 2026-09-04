import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string>('corsOrigin'),
    credentials: true,
  });

  configureApp(app);

  const port = config.getOrThrow<number>('port');
  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(`API escuchando en http://localhost:${port}/api`);
}

void bootstrap();
