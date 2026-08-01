/**
 * utils/auth-simulado.js
 * FASE 2 — Autenticación real contra el backend Express: JWT real, 2FA real
 * por correo electrónico y creación de operadores con envío real de
 * credenciales. Se conservan los nombres de función de la Fase 1 para no
 * romper las pantallas que ya los usan.
 */

/**
 * Calcula el prefijo relativo hacia la raíz de "public/" según la carpeta
 * actual, para poder redirigir a login.html / index.html desde cualquier
 * profundidad de carpeta.
 */
function rutaBaseRelativa() {
  const path = window.location.pathname;
  if (/\/(ciudadano|operador|admin)\//.test(path)) return '../';
  return '';
}

/**
 * Guarda la sesión (token JWT real + datos básicos del usuario) en localStorage.
 */
function guardarSesion(usuario, token) {
  const sesion = {
    token,
    usuario: {
      id: usuario.id,
      rol: usuario.rol,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      cargo: usuario.cargo || null,
      zona: usuario.zona || usuario.zonaAsignada || null,
      fotoPerfil: usuario.fotoPerfil || null,
    },
    creadaEl: Date.now(),
  };
  Storage.set(STORAGE_KEYS.SESION, sesion);
  return sesion;
}

function obtenerSesionActual() {
  return Storage.get(STORAGE_KEYS.SESION, null);
}

/**
 * Actualiza solo la foto de perfil dentro de la sesión guardada (tras subir
 * una nueva desde perfil.html), para que el sidebar/navbar la reflejen sin
 * necesidad de volver a iniciar sesión.
 */
function actualizarFotoPerfilSesion(fotoPerfil) {
  const sesion = obtenerSesionActual();
  if (!sesion) return null;
  sesion.usuario.fotoPerfil = fotoPerfil;
  Storage.set(STORAGE_KEYS.SESION, sesion);
  return sesion;
}

/**
 * Cierra sesión: avisa al backend (best-effort, el JWT es stateless) y
 * limpia el estado local antes de redirigir al login.
 */
async function cerrarSesion() {
  try {
    await apiPost('/auth/logout', undefined, { autenticado: true });
  } catch (err) {
    // La sesión se limpia igual aunque la llamada falle (p. ej. sin conexión).
  }
  Storage.remove(STORAGE_KEYS.SESION);
  Storage.remove(STORAGE_KEYS.DOS_FA_PENDIENTE);
  window.location.href = `${rutaBaseRelativa()}login.html`;
}

/**
 * Protege una pantalla interna: si no hay sesión válida o el rol no coincide,
 * redirige a login.html. Debe llamarse al inicio del script de cada página protegida.
 * @param {string[]} rolesPermitidos - ej. ['admin'], ['operador'], ['ciudadano']
 */
function protegerRuta(rolesPermitidos) {
  const sesion = obtenerSesionActual();
  if (!sesion || !sesion.usuario || !sesion.token) {
    window.location.href = `${rutaBaseRelativa()}login.html`;
    return null;
  }
  if (rolesPermitidos && !rolesPermitidos.includes(sesion.usuario.rol)) {
    window.location.href = `${rutaBaseRelativa()}login.html`;
    return null;
  }
  return sesion;
}

/**
 * Paso 1 de login: valida correo/DNI + contraseña contra el backend.
 * - Ciudadano: el backend devuelve el JWT directo (sin 2FA); se guarda la sesión aquí mismo.
 * - Operador/Admin: el backend envía un código por correo real y responde requiere2FA=true.
 * @returns {Promise<{ok:boolean, mensaje?:string, usuario?:object, requiere2FA?:boolean}>}
 */
async function iniciarLogin(identificador, password) {
  try {
    const respuesta = await apiPost('/auth/login', { identificador, password }, { autenticado: false });
    const { requiere2FA, usuario, token, correo } = respuesta.data;

    if (requiere2FA) {
      Storage.set(STORAGE_KEYS.DOS_FA_PENDIENTE, { correo });
      return { ok: true, requiere2FA: true, correo, mensaje: respuesta.message };
    }

    guardarSesion(usuario, token);
    return { ok: true, requiere2FA: false, usuario, mensaje: respuesta.message };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}

/**
 * Paso 2 de login: valida el código 2FA ingresado contra el backend.
 */
async function verificarCodigo2FA(codigoIngresado) {
  const pendiente = Storage.get(STORAGE_KEYS.DOS_FA_PENDIENTE, null);
  if (!pendiente) {
    return { ok: false, mensaje: 'No hay una verificación pendiente. Inicia sesión nuevamente.' };
  }

  try {
    const respuesta = await apiPost(
      '/auth/verificar-2fa',
      { correo: pendiente.correo, codigo: codigoIngresado.trim() },
      { autenticado: false }
    );
    const { usuario, token } = respuesta.data;
    guardarSesion(usuario, token);
    Storage.remove(STORAGE_KEYS.DOS_FA_PENDIENTE);
    return { ok: true, usuario, mensaje: respuesta.message };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}

/**
 * Reenvía (regenera) el código 2FA para el correo con verificación pendiente.
 */
async function reenviarCodigo2FA() {
  const pendiente = Storage.get(STORAGE_KEYS.DOS_FA_PENDIENTE, null);
  if (!pendiente) return { ok: false, mensaje: 'No hay una verificación pendiente.' };

  try {
    const respuesta = await apiPost('/auth/reenviar-2fa', { correo: pendiente.correo }, { autenticado: false });
    return { ok: true, mensaje: respuesta.message };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}

/**
 * Registro público de ciudadanos (Fase 2: sin verificación en dos pasos,
 * igual que en la Fase 1; ahora persiste en el backend real).
 * @param {{correo:string, password:string, dni:string, zona:string}} datos
 */
async function registrarCiudadano(datos) {
  try {
    const respuesta = await apiPost('/auth/registro-ciudadano', datos, { autenticado: false });
    const { usuario, token } = respuesta.data;
    return { ok: true, usuario, token, mensaje: respuesta.message };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}

/**
 * Creación de cuentas de operador — exclusiva del panel admin.
 * El backend genera la contraseña temporal y envía un correo REAL con las
 * credenciales; por seguridad, la contraseña ya no viaja de vuelta al navegador.
 * @param {{nombres, apellidos, dni, correo, telefono, zonaAsignada, camionAsignado}} datos
 */
async function crearCuentaOperador(datos) {
  try {
    const usuario = await crearOperador(datos);
    return { ok: true, usuario, mensaje: `Se creó la cuenta y se enviaron las credenciales a ${usuario.correo}.` };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}

/**
 * Creación de cuentas de administrador — exclusiva del panel admin.
 * Mismo flujo que crearCuentaOperador(): contraseña temporal generada y
 * enviada por correo por el backend; nunca viaja de vuelta al navegador.
 * @param {{nombres, apellidos, dni, correo}} datos
 */
/**
 * Solicita el restablecimiento de contraseña de una cuenta (propia o, si la
 * invoca un admin desde el panel, en nombre de otro usuario). El backend
 * genera una contraseña temporal y la envía solo por correo: nunca viaja de
 * vuelta al navegador.
 */
async function olvidarPassword(correo) {
  try {
    const respuesta = await apiPost('/auth/olvide-password', { correo }, { autenticado: false });
    return { ok: true, mensaje: respuesta.message };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}

async function crearCuentaAdmin(datos) {
  try {
    const usuario = await crearAdministrador(datos);
    return { ok: true, usuario, mensaje: `Se creó la cuenta y se enviaron las credenciales a ${usuario.correo}.` };
  } catch (err) {
    return { ok: false, mensaje: err.message };
  }
}

window.rutaBaseRelativa = rutaBaseRelativa;
window.guardarSesion = guardarSesion;
window.obtenerSesionActual = obtenerSesionActual;
window.actualizarFotoPerfilSesion = actualizarFotoPerfilSesion;
window.cerrarSesion = cerrarSesion;
window.protegerRuta = protegerRuta;
window.iniciarLogin = iniciarLogin;
window.verificarCodigo2FA = verificarCodigo2FA;
window.reenviarCodigo2FA = reenviarCodigo2FA;
window.registrarCiudadano = registrarCiudadano;
window.crearCuentaOperador = crearCuentaOperador;
window.crearCuentaAdmin = crearCuentaAdmin;
window.olvidarPassword = olvidarPassword;
