import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
      // Busca el .env en la raiz del monorepo y, si no, en el del propio backend.
      envFilePath: ['../../.env', '.env'],
    }),
    HealthModule,
  ],
})
export class AppModule {}
