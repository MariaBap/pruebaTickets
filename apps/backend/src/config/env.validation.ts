import * as Joi from 'joi';

/**
 * Esquema de validacion de las variables de entorno.
 *
 * Se aplica al arrancar la aplicacion: si falta una variable o tiene un valor
 * invalido, el proceso falla de inmediato con un mensaje explicito en vez de
 * arrancar y romperse mas tarde en runtime (p. ej. firmando JWT con `undefined`
 * o disparando el webhook de n8n a una URL vacia).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),

  // Base de datos
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  // Autenticacion
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET debe tener al menos 32 caracteres.',
  }),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  // CORS: origen del frontend autorizado a llamar la API.
  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  // Integracion con n8n (saliente).
  N8N_WEBHOOK_URL: Joi.string().uri().required(),
  N8N_WEBHOOK_TIMEOUT_MS: Joi.number().integer().min(500).default(5000),

  // Integracion con n8n (entrante): secreto compartido del callback.
  N8N_WEBHOOK_SECRET: Joi.string().min(16).required().messages({
    'string.min': 'N8N_WEBHOOK_SECRET debe tener al menos 16 caracteres.',
  }),
});
