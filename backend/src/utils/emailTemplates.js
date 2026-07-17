/**
 * utils/emailTemplates.js
 * Plantillas HTML simples para los correos reales que envía la API
 * (código 2FA y credenciales de operador recién creado).
 */

function envoltorio(tituloInterno, contenidoHtml) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #dfe6e2; border-radius: 10px; overflow: hidden;">
      <div style="background:#0b1f31; color:#fff; padding:16px 24px;">
        <strong>EcoRutas Wanchaq</strong><br>
        <span style="font-size:12px; color:#c7d8cd;">Municipalidad Distrital de Wanchaq — Gerencia de Gestión Ambiental</span>
      </div>
      <div style="padding:24px; color:#16241d;">
        <h2 style="margin-top:0;">${tituloInterno}</h2>
        ${contenidoHtml}
      </div>
      <div style="background:#eef2f0; color:#78897f; padding:12px 24px; font-size:11px;">
        Este es un mensaje automático de EcoRutas Wanchaq (Fase 2 — entorno de desarrollo). No respondas a este correo.
      </div>
    </div>
  `;
}

function plantillaCodigo2FA(nombre, codigo, minutosExpiracion) {
  return envoltorio(
    'Tu código de verificación',
    `
      <p>Hola ${nombre},</p>
      <p>Usa el siguiente código para completar tu inicio de sesión:</p>
      <p style="font-size:32px; font-weight:bold; letter-spacing:6px; text-align:center; color:#1f7d43;">${codigo}</p>
      <p>Este código expira en ${minutosExpiracion} minutos. Si no intentaste iniciar sesión, ignora este mensaje.</p>
    `
  );
}

function plantillaCredencialesOperador(nombre, correo, passwordTemporal) {
  return envoltorio(
    'Tu cuenta de operador fue creada',
    `
      <p>Hola ${nombre},</p>
      <p>Se creó tu cuenta como <strong>Operador de Recolección — Flota Municipal</strong> en EcoRutas Wanchaq.</p>
      <p><strong>Correo:</strong> ${correo}<br>
      <strong>Contraseña temporal:</strong> ${passwordTemporal}</p>
      <p>Por seguridad, cambia esta contraseña apenas inicies sesión. Recuerda que tu acceso requiere verificación en dos pasos (2FA).</p>
    `
  );
}

module.exports = { plantillaCodigo2FA, plantillaCredencialesOperador };
