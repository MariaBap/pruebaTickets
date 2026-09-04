/**
 * Los tests e2e corren contra una base de datos propia, derivada de la de
 * desarrollo cambiando solo el nombre. Así se ejercita Postgres de verdad
 * —incluidos enums, arrays e índices— sin tocar los datos con los que se
 * trabaja a mano.
 */
export const TEST_DATABASE_NAME = 'crazysupporthub_test';

/** Devuelve la URL de la base de tests a partir de la de desarrollo. */
export function testDatabaseUrl(baseUrl = process.env.DATABASE_URL): string {
  if (!baseUrl) {
    throw new Error(
      'Falta DATABASE_URL. Ejecuta los tests con `npm run test:e2e -w apps/backend`.',
    );
  }

  const url = new URL(baseUrl);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  return url.toString();
}

/** URL del servidor apuntando a la base `postgres`, para poder crear la de tests. */
export function maintenanceDatabaseUrl(baseUrl = process.env.DATABASE_URL): string {
  const url = new URL(baseUrl as string);
  url.pathname = '/postgres';
  url.search = '';
  return url.toString();
}
