import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Guard global: el default es "ruta protegida". Lo que no exige token
    // tiene que declararlo con @Public(), no al reves.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // El orden importa: RolesGuard se declara despues para que corra con un
    // usuario ya autenticado en la peticion.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
