import { Role } from '../../../generated/prisma';

/** Lo que la estrategia JWT adjunta a la peticion tras validar el token. */
export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: Role;
}

/** Contenido del JWT que firma la API. */
export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}
