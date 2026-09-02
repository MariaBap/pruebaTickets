/**
 * Configuracion tipada derivada de las variables de entorno ya validadas.
 * El resto de la aplicacion lee de aqui y nunca de `process.env` directamente.
 */
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  corsOrigin: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  n8n: {
    webhookUrl: string;
    webhookSecret: string;
    timeoutMs: number;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV as AppConfig['nodeEnv'],
  port: parseInt(process.env.PORT as string, 10),
  corsOrigin: process.env.CORS_ORIGIN as string,
  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: process.env.JWT_EXPIRES_IN as string,
  },
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL as string,
    webhookSecret: process.env.N8N_WEBHOOK_SECRET as string,
    timeoutMs: parseInt(process.env.N8N_WEBHOOK_TIMEOUT_MS as string, 10),
  },
});
