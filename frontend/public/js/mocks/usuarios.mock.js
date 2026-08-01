/**
 * mocks/usuarios.mock.js
 * FASE 2 — Reemplaza los datos simulados por llamadas reales al backend.
 * Se conservan los nombres usados en la Fase 1 (obtenerUsuariosSemilla)
 * para no romper utils/storage.js, y se agregan las funciones de perfil
 * y gestión que requiere el backend real.
 */

/**
 * Lista completa de usuarios (solo admin). Antes devolvía la "semilla" de
 * usuarios simulados; ahora consulta GET /api/usuarios con una página
 * grande para conservar el mismo contrato (arreglo plano) que esperaban
 * las pantallas de administración de la Fase 1.
 */
async function obtenerUsuariosSemilla() {
  const respuesta = await apiGet('/usuarios?porPagina=1000');
  return respuesta.data;
}

/**
 * Ciudadanos activos residentes en una zona (operador/admin) — usado para
 * identificar al vecino de una recolección registrada.
 */
async function obtenerCiudadanosPorZona(zonaId) {
  if (!zonaId) return [];
  const respuesta = await apiGet(`/usuarios/ciudadanos-por-zona/${zonaId}`);
  return respuesta.data;
}

/**
 * Sube/reemplaza la foto de perfil del usuario autenticado (cualquier rol).
 */
async function subirFotoPerfil(archivo) {
  const datosFormulario = new FormData();
  datosFormulario.append('foto', archivo);
  const respuesta = await apiPut('/usuarios/perfil/foto', datosFormulario);
  return respuesta.data.usuario;
}

/**
 * Igual que subirFotoPerfil(), pero reporta progreso real de subida (byte a
 * byte, vía XMLHttpRequest — fetch no expone progreso de subida) para usarla
 * con la zona de carga de archivos (utils/uploadZone.js).
 * @param {File} archivo
 * @param {(porcentaje:number)=>void} onProgress
 */
function subirFotoPerfilConProgreso(archivo, onProgress) {
  return new Promise((resolve, reject) => {
    const datosFormulario = new FormData();
    datosFormulario.append('foto', archivo);

    const sesion = Storage.get(STORAGE_KEYS.SESION, null);
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${API_BASE_URL}/usuarios/perfil/foto`);
    if (sesion?.token) xhr.setRequestHeader('Authorization', `Bearer ${sesion.token}`);

    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 100));
    });

    xhr.addEventListener('load', () => {
      let datos = null;
      try { datos = JSON.parse(xhr.responseText); } catch (err) { /* respuesta sin cuerpo JSON */ }

      if (xhr.status >= 200 && xhr.status < 300 && datos?.success) {
        resolve(datos.data.usuario);
      } else {
        reject(new Error(datos?.message || 'No se pudo subir la foto de perfil.'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('No se pudo conectar con el servidor.')));

    xhr.send(datosFormulario);
  });
}

/**
 * Perfil del usuario autenticado (cualquier rol).
 */
async function obtenerMiPerfil() {
  const respuesta = await apiGet('/usuarios/perfil');
  return respuesta.data;
}

/**
 * Actualiza datos propios (teléfono, zona, dirección).
 */
async function actualizarMiPerfil(cambios) {
  const respuesta = await apiPut('/usuarios/perfil', cambios);
  return respuesta.data.usuario;
}

/**
 * Cambia la contraseña del usuario autenticado.
 */
async function cambiarMiPassword({ passwordActual, passwordNueva }) {
  const respuesta = await apiPut('/usuarios/perfil/password', { passwordActual, passwordNueva });
  return respuesta.message;
}

/**
 * Crea una cuenta de operador (admin). Único punto de alta de operadores;
 * el backend envía las credenciales por correo real.
 */
async function crearOperador(datos) {
  const respuesta = await apiPost('/usuarios/operadores', datos);
  return respuesta.data.usuario;
}

/**
 * Crea una cuenta de administrador (admin). Único punto de alta para este
 * rol, igual que con operadores; el backend envía las credenciales por correo.
 */
async function crearAdministrador(datos) {
  const respuesta = await apiPost('/usuarios/administradores', datos);
  return respuesta.data.usuario;
}

/**
 * Actualiza datos de un usuario (admin).
 */
async function actualizarUsuario(id, cambios) {
  const respuesta = await apiPut(`/usuarios/${id}`, cambios);
  return respuesta.data.usuario;
}

/**
 * Activa/desactiva la cuenta de un usuario (admin).
 */
async function cambiarEstadoUsuario(id) {
  const respuesta = await apiPatch(`/usuarios/${id}/estado`);
  return respuesta.data.usuario;
}

/**
 * Asigna/reasigna la zona de recolección y el camión de un operador (admin).
 * @param {number|string} id
 * @param {{zonaId: number|string|null, camionId: number|string|null}} asignacion
 */
async function asignarZonaCamionOperador(id, { zonaId, camionId }) {
  const respuesta = await apiPut(`/usuarios/${id}/asignacion`, { zonaId, camionId });
  return respuesta.data.usuario;
}

window.obtenerUsuariosSemilla = obtenerUsuariosSemilla;
window.obtenerCiudadanosPorZona = obtenerCiudadanosPorZona;
window.subirFotoPerfil = subirFotoPerfil;
window.subirFotoPerfilConProgreso = subirFotoPerfilConProgreso;
window.obtenerMiPerfil = obtenerMiPerfil;
window.actualizarMiPerfil = actualizarMiPerfil;
window.cambiarMiPassword = cambiarMiPassword;
window.crearOperador = crearOperador;
window.crearAdministrador = crearAdministrador;
window.actualizarUsuario = actualizarUsuario;
window.cambiarEstadoUsuario = cambiarEstadoUsuario;
window.asignarZonaCamionOperador = asignarZonaCamionOperador;
