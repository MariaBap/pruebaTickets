import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../types/authenticated-user';

/** Inyecta el usuario autenticado en el handler, ya tipado. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return request.user;
  },
);
