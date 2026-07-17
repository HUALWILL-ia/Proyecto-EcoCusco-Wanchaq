/**
 * utils/generarPasswordTemporal.js
 * Genera una contraseña temporal legible para cuentas de operador recién
 * creadas por el admin. El operador deberá cambiarla en su primer acceso.
 */

function generarPasswordTemporal() {
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const numeros = '23456789';
  let resultado = '';
  for (let i = 0; i < 6; i++) resultado += letras[Math.floor(Math.random() * letras.length)];
  for (let i = 0; i < 2; i++) resultado += numeros[Math.floor(Math.random() * numeros.length)];
  return resultado;
}

module.exports = generarPasswordTemporal;
