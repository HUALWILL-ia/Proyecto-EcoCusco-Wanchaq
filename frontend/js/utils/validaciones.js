/**
 * utils/validaciones.js
 * Validaciones de formularios en el cliente para EcoRutas Wanchaq (Fase 1).
 * Todas las funciones son puras y devuelven { valido: boolean, mensaje?: string }.
 */

function validarCampoObligatorio(valor) {
  const texto = (valor ?? '').toString().trim();
  if (texto.length === 0) {
    return { valido: false, mensaje: 'Este campo es obligatorio.' };
  }
  return { valido: true };
}

function validarCorreo(correo) {
  const texto = (correo ?? '').trim();
  if (texto.length === 0) {
    return { valido: false, mensaje: 'El correo electrónico es obligatorio.' };
  }
  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!patron.test(texto)) {
    return { valido: false, mensaje: 'Ingresa un correo electrónico válido.' };
  }
  return { valido: true };
}

function validarDNI(dni) {
  const texto = (dni ?? '').trim();
  if (texto.length === 0) {
    return { valido: false, mensaje: 'El DNI es obligatorio.' };
  }
  if (!/^\d{8}$/.test(texto)) {
    return { valido: false, mensaje: 'El DNI debe tener exactamente 8 dígitos numéricos.' };
  }
  return { valido: true };
}

/**
 * Celular peruano: 9 dígitos, siempre empieza en 9. Acepta el valor con
 * espacios/guiones (como se ve en las cuentas semilla, ej. "984 512 340")
 * y lo normaliza a solo dígitos antes de validar.
 */
function validarCelular(celular) {
  const soloDigitos = (celular ?? '').replace(/\D/g, '');
  if (soloDigitos.length === 0) {
    return { valido: false, mensaje: 'El celular es obligatorio.' };
  }
  if (!/^9\d{8}$/.test(soloDigitos)) {
    return { valido: false, mensaje: 'Ingresa un celular peruano válido: 9 dígitos, debe empezar en 9.' };
  }
  return { valido: true, valor: soloDigitos };
}

/**
 * Contraseña: mínimo 8 caracteres, al menos una letra y un número.
 */
function validarPassword(password) {
  const texto = password ?? '';
  if (texto.length === 0) {
    return { valido: false, mensaje: 'La contraseña es obligatoria.' };
  }
  if (texto.length < 8) {
    return { valido: false, mensaje: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  const tieneLetra = /[a-zA-Z]/.test(texto);
  const tieneNumero = /\d/.test(texto);
  if (!tieneLetra || !tieneNumero) {
    return { valido: false, mensaje: 'La contraseña debe incluir letras y números.' };
  }
  return { valido: true };
}

function validarConfirmacionPassword(password, confirmacion) {
  if ((confirmacion ?? '').length === 0) {
    return { valido: false, mensaje: 'Confirma tu contraseña.' };
  }
  if (password !== confirmacion) {
    return { valido: false, mensaje: 'Las contraseñas no coinciden.' };
  }
  return { valido: true };
}

function validarSeleccionZona(zona) {
  if (!zona || zona.trim().length === 0) {
    return { valido: false, mensaje: 'Selecciona tu zona de residencia.' };
  }
  return { valido: true };
}

function validarTerminos(aceptado) {
  if (!aceptado) {
    return { valido: false, mensaje: 'Debes aceptar los términos y condiciones para continuar.' };
  }
  return { valido: true };
}

/**
 * Código de verificación en dos pasos: exactamente 6 dígitos numéricos.
 */
function validarCodigo2FA(codigo) {
  const texto = (codigo ?? '').trim();
  if (texto.length === 0) {
    return { valido: false, mensaje: 'Ingresa el código de verificación.' };
  }
  if (!/^\d{6}$/.test(texto)) {
    return { valido: false, mensaje: 'El código debe tener exactamente 6 dígitos.' };
  }
  return { valido: true };
}

/**
 * Verifica que el correo no esté ya registrado en la colección de usuarios.
 * Requiere que utils/storage.js esté cargado antes.
 */
function validarCorreoNoDuplicado(correo, listaUsuarios) {
  const existe = listaUsuarios.some(
    (u) => u.correo.toLowerCase() === correo.trim().toLowerCase()
  );
  if (existe) {
    return { valido: false, mensaje: 'Ya existe una cuenta registrada con este correo.' };
  }
  return { valido: true };
}

function validarDNINoDuplicado(dni, listaUsuarios) {
  const existe = listaUsuarios.some((u) => u.dni === dni.trim());
  if (existe) {
    return { valido: false, mensaje: 'Ya existe una cuenta registrada con este DNI.' };
  }
  return { valido: true };
}

window.validarCampoObligatorio = validarCampoObligatorio;
window.validarCorreo = validarCorreo;
window.validarDNI = validarDNI;
window.validarCelular = validarCelular;
window.validarPassword = validarPassword;
window.validarConfirmacionPassword = validarConfirmacionPassword;
window.validarSeleccionZona = validarSeleccionZona;
window.validarTerminos = validarTerminos;
window.validarCodigo2FA = validarCodigo2FA;
window.validarCorreoNoDuplicado = validarCorreoNoDuplicado;
window.validarDNINoDuplicado = validarDNINoDuplicado;
