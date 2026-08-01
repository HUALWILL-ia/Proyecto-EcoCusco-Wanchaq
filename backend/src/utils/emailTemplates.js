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
        Este es un mensaje automático de EcoRutas Wanchaq. No respondas a este correo.
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

function plantillaCredencialesAdmin(nombre, correo, passwordTemporal) {
  return envoltorio(
    'Tu cuenta de administrador fue creada',
    `
      <p>Hola ${nombre},</p>
      <p>Se creó tu cuenta como <strong>Administrador</strong> en EcoRutas Wanchaq.</p>
      <p><strong>Correo:</strong> ${correo}<br>
      <strong>Contraseña temporal:</strong> ${passwordTemporal}</p>
      <p>Por seguridad, cambia esta contraseña apenas inicies sesión. Recuerda que tu acceso requiere verificación en dos pasos (2FA).</p>
    `
  );
}

function plantillaRecoleccionRegistrada(nombre, { tipoResiduo, kg, fecha, camionPlaca, zonaNombre }) {
  const fechaTexto = new Date(fecha).toLocaleString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return envoltorio(
    'Se registró la recolección de tu residuo',
    `
      <p>Hola ${nombre},</p>
      <p>El camión recolector pasó por tu zona y se registró la recolección de tu residuo:</p>
      <ul>
        <li><strong>Tipo de residuo:</strong> ${tipoResiduo}</li>
        <li><strong>Peso aproximado:</strong> ${kg} kg</li>
        <li><strong>Fecha y hora:</strong> ${fechaTexto}</li>
        <li><strong>Camión:</strong> ${camionPlaca || 'No identificado'}</li>
        <li><strong>Zona/ruta:</strong> ${zonaNombre || 'No identificada'}</li>
      </ul>
      <p>Gracias por contribuir con la gestión de residuos sólidos de Wanchaq.</p>
    `
  );
}

function plantillaPasswordTemporal(nombre, correo, passwordTemporal) {
  return envoltorio(
    'Se restableció tu contraseña',
    `
      <p>Hola ${nombre},</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en EcoRutas Wanchaq.</p>
      <p><strong>Correo:</strong> ${correo}<br>
      <strong>Contraseña temporal:</strong> ${passwordTemporal}</p>
      <p>Usa esta contraseña para iniciar sesión y cámbiala de inmediato desde tu perfil. Si tú no solicitaste este cambio, contacta a la municipalidad.</p>
    `
  );
}

module.exports = {
  plantillaCodigo2FA,
  plantillaCredencialesOperador,
  plantillaCredencialesAdmin,
  plantillaPasswordTemporal,
  plantillaRecoleccionRegistrada,
};
