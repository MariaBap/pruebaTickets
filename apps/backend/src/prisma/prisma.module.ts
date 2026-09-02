import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global para no repetir el import en cada modulo de dominio.
 * Es la unica puerta de acceso a la base de datos.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
