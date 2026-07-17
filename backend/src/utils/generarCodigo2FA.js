/**
 * utils/generarCodigo2FA.js
 * Genera un código numérico de 6 dígitos para la verificación en dos pasos.
 */

function generarCodigo2FA() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = generarCodigo2FA;
