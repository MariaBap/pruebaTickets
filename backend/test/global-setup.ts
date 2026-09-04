import { execSync } from 'node:child_process';
import { Client } from 'pg';
import { TEST_DATABASE_NAME, maintenanceDatabaseUrl, testDatabaseUrl } from './utils/test-database';

/**
 * Prepara la base de datos de tests una sola vez por ejecución:
 * la crea si no existe y le aplica las migraciones.
 *
 * Se usan las migraciones reales y no `db push` para que los tests corran
 * contra el mismo esquema que se despliega, migraciones incluidas.
 */
export default async function globalSetup(): Promise<void> {
  const client = new Client({ connectionString: maintenanceDatabaseUrl() });
  await client.connect();

  const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    TEST_DATABASE_NAME,
  ]);

  if (existing.rowCount === 0) {
    // El nombre es una constante del propio código, no entrada de usuario.
    await client.query(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);
    console.log(`[tests] base de datos "${TEST_DATABASE_NAME}" creada`);
  }

  await client.end();

  execSync('npx prisma migrate deploy', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
  });
}
