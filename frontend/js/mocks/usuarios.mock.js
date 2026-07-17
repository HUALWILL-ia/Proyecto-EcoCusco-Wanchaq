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

window.obtenerUsuariosSemilla = obtenerUsuariosSemilla;
window.obtenerMiPerfil = obtenerMiPerfil;
window.actualizarMiPerfil = actualizarMiPerfil;
window.cambiarMiPassword = cambiarMiPassword;
window.crearOperador = crearOperador;
window.actualizarUsuario = actualizarUsuario;
window.cambiarEstadoUsuario = cambiarEstadoUsuario;
