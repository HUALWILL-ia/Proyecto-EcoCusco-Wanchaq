/**
 * config/env.js
 * Punto único de lectura de variables de entorno. El resto del backend
 * nunca debe leer process.env directamente: importa este módulo.
 */

require('dotenv').config();

const env = {
  PORT: Number(process.env.PORT) || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  JWT_SECRET: process.env.JWT_SECRET || 'ecorutas-wanchaq-dev-secret-inseguro',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5500',

  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || 'eccoCusco',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',

  MAIL_PROVIDER: (process.env.MAIL_PROVIDER || 'gmail').toLowerCase(),

  GMAIL_USER: process.env.GMAIL_USER || '',
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD || '',

  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'EcoRutas Wanchaq <onboarding@resend.dev>',

  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || '',
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'EcoRutas Wanchaq',

  DNI_API_TOKEN: process.env.DNI_API_TOKEN || '',
};

if (env.JWT_SECRET === 'ecorutas-wanchaq-dev-secret-inseguro' && env.isProduction) {
  // eslint-disable-next-line no-console
  console.warn('[env] ADVERTENCIA: usando JWT_SECRET por defecto en producción. Configura un secreto real.');
}

module.exports = env;
