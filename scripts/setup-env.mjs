#!/usr/bin/env node
/**
 * Genera el archivo `.env` a partir de `.env.example`, rellenando cada
 * marcador con un valor aleatorio.
 *
 *   npm run setup:env            crea .env si no existe
 *   npm run setup:env -- --force lo regenera, perdiendo los valores actuales
 */

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLE = join(ROOT, '.env.example');
const TARGET = join(ROOT, '.env');

const force = process.argv.includes('--force');

if (!existsSync(EXAMPLE)) {
  console.error('No se encuentra .env.example. ¿Estás en la raíz del repositorio?');
  process.exit(1);
}

if (existsSync(TARGET) && !force) {
  console.log('Ya existe un .env; no se toca.');
  console.log('Para regenerarlo y perder los valores actuales: npm run setup:env -- --force');
  process.exit(0);
}

const hex = (bytes) => randomBytes(bytes).toString('hex');

// Los secretos se generan; el usuario y la base llevan un nombre legible porque
// aparecen en los mensajes de Postgres y ayuda que se entiendan.
const values = {
  POSTGRES_USER: 'crazysupport',
  POSTGRES_PASSWORD: hex(12),
  POSTGRES_DB: 'crazysupporthub',
  JWT_SECRET: hex(32),
  N8N_WEBHOOK_SECRET: hex(24),
  N8N_ENCRYPTION_KEY: hex(24),
};

const isPlaceholder = (value) => value.includes('<') && value.includes('>');

const lines = readFileSync(EXAMPLE, 'utf8').split(/\r?\n/);
const filled = [];
let replaced = 0;

for (const line of lines) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);

  if (!match) {
    filled.push(line);
    continue;
  }

  const [, key, value] = match;

  // DATABASE_URL se reconstruye entera: contiene el usuario y la contraseña, y
  // apunta a localhost porque este .env es el del desarrollo fuera de Docker.
  // Dentro de compose, el servicio backend recibe la suya con el host `postgres`.
  if (key === 'DATABASE_URL') {
    const port = process.env.POSTGRES_PORT ?? '5433';
    filled.push(
      `DATABASE_URL=postgresql://${values.POSTGRES_USER}:${values.POSTGRES_PASSWORD}` +
        `@localhost:${port}/${values.POSTGRES_DB}?schema=public`,
    );
    replaced += 1;
    continue;
  }

  if (isPlaceholder(value) && values[key] !== undefined) {
    filled.push(`${key}=${values[key]}`);
    replaced += 1;
    continue;
  }

  if (isPlaceholder(value)) {
    console.warn(`Aviso: ${key} sigue con un marcador; rellénalo a mano.`);
  }

  filled.push(line);
}

writeFileSync(TARGET, filled.join('\n'), 'utf8');

console.log(`.env creado con ${replaced} valores generados.`);
console.log('');
console.log(`  Usuario de Postgres   ${values.POSTGRES_USER}`);
console.log(`  Base de datos         ${values.POSTGRES_DB}`);
console.log('  Secretos              generados al azar (JWT, callback de n8n, cifrado de n8n)');
console.log('');
console.log('Ya puedes ejecutar:  docker compose up --build');
