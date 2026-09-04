import { testDatabaseUrl } from './utils/test-database';

/**
 * Se ejecuta antes de cargar los módulos de cada fichero de test.
 *
 * Redirige la conexión a la base de tests antes de que Prisma lea
 * DATABASE_URL, y fija NODE_ENV para que la validación de entorno sepa que
 * está en modo test.
 */
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';

// El disparo saliente se sustituye por un doble en los tests, pero la
// configuración se valida al arrancar, así que la URL debe existir y ser válida.
process.env.N8N_WEBHOOK_URL ??= 'http://n8n.invalido.test/webhook/ticket-created';
