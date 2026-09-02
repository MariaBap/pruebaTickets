import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '../../../generated/prisma';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Autorizacion por rol a nivel de ruta.
 *
 * Corre despues del JwtAuthGuard, asi que en este punto ya hay un usuario
 * autenticado. Devuelve 403 (autenticado pero sin permiso), no 401.
 *
 * Ojo: esto solo cubre "quien puede llamar a este endpoint". El alcance de
 * datos de un agent (ver unicamente los tickets que creo o tiene asignados)
 * NO se resuelve aqui, sino dentro del where de la consulta; filtrar en
 * memoria despues de paginar devolveria paginas incompletas.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción.');
    }

    return true;
  }
}
