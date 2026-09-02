import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta como accesible sin token.
 * El guard de JWT es global, asi que el default es "protegido" y hay que
 * excluir explicitamente lo que no lo esta.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
