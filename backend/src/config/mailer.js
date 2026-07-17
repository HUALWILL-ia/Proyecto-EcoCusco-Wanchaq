/**
 * config/mailer.js
 * Envío de correo real usando proveedores 100% gratuitos, intercambiables
 * mediante la variable de entorno MAIL_PROVIDER. El resto del backend solo
 * conoce enviarCorreo({ to, subject, html }); nunca sabe qué proveedor hay detrás.
 *
 * Proveedores soportados:
 *  - gmail  (por defecto): SMTP de Gmail con "contraseña de aplicación" (nodemailer).
 *  - resend: API HTTP de https://resend.com — 100 correos/día gratis.
 *  - brevo:  API HTTP de https://brevo.com  — 300 correos/día gratis.
 *
 * Si el proveedor configurado falla o no tiene credenciales, se hace un
 * fallback a "modo consola": el correo se imprime en los logs del servidor
 * para no bloquear el desarrollo ni una demostración sin credenciales reales.
 */

const nodemailer = require('nodemailer');
const env = require('./env');
const logger = require('../utils/logger');

let transporteGmail = null;

function obtenerTransporteGmail() {
  if (transporteGmail) return transporteGmail;
  transporteGmail = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD,
    },
  });
  return transporteGmail;
}

async function enviarConGmail({ to, subject, html }) {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD no configurados.');
  }
  const transporte = obtenerTransporteGmail();
  await transporte.sendMail({
    from: `"EcoRutas Wanchaq" <${env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

async function enviarConResend({ to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY no configurado.');
  }
  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Resend respondió ${respuesta.status}: ${detalle}`);
  }
}

async function enviarConBrevo({ to, subject, html }) {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    throw new Error('BREVO_API_KEY / BREVO_SENDER_EMAIL no configurados.');
  }
  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: env.BREVO_SENDER_NAME, email: env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Brevo respondió ${respuesta.status}: ${detalle}`);
  }
}

function enviarPorConsola({ to, subject, html }) {
  logger.warn('[mailer] Envío en modo CONSOLA (sin proveedor de correo configurado o falló el envío real).');
  // eslint-disable-next-line no-console
  console.log(`\n----- CORREO SIMULADO -----\nPara: ${to}\nAsunto: ${subject}\n${html.replace(/<[^>]+>/g, ' ').trim()}\n---------------------------\n`);
}

const PROVEEDORES = {
  gmail: enviarConGmail,
  resend: enviarConResend,
  brevo: enviarConBrevo,
};

/**
 * Envía un correo usando el proveedor configurado en MAIL_PROVIDER.
 * Nunca lanza: si falla, degrada a modo consola para no romper el flujo.
 * @param {{to: string, subject: string, html: string}} opciones
 */
async function enviarCorreo({ to, subject, html }) {
  const enviarConProveedor = PROVEEDORES[env.MAIL_PROVIDER];

  if (!enviarConProveedor) {
    logger.warn(`[mailer] MAIL_PROVIDER "${env.MAIL_PROVIDER}" no reconocido. Usando modo consola.`);
    enviarPorConsola({ to, subject, html });
    return { ok: true, modo: 'consola' };
  }

  try {
    await enviarConProveedor({ to, subject, html });
    logger.info(`[mailer] Correo enviado vía ${env.MAIL_PROVIDER} a ${to} — "${subject}"`);
    return { ok: true, modo: env.MAIL_PROVIDER };
  } catch (err) {
    logger.error(`[mailer] Falló el envío vía ${env.MAIL_PROVIDER}: ${err.message}`);
    enviarPorConsola({ to, subject, html });
    return { ok: true, modo: 'consola', error: err.message };
  }
}

module.exports = { enviarCorreo };
