import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../generated/prisma';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a los roles indicados.
 * Sin este decorador, basta con estar autenticado.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
