/**
 * mocks/notificaciones.mock.js
 * FASE 2 — Notificaciones del usuario autenticado, servidas por el backend real.
 */

/**
 * Notificaciones del usuario autenticado. Se conserva el nombre de la Fase 1.
 */
async function obtenerNotificacionesSemilla() {
  const respuesta = await apiGet('/notificaciones');
  return respuesta.data;
}

async function marcarNotificacionLeida(id) {
  const respuesta = await apiPatch(`/notificaciones/${id}/leida`);
  return respuesta.data;
}

async function marcarTodasNotificacionesLeidas() {
  const respuesta = await apiPatch('/notificaciones/leer-todas');
  return respuesta.message;
}

async function obtenerPreferenciasNotificaciones() {
  const respuesta = await apiGet('/notificaciones/preferencias');
  return respuesta.data;
}

async function actualizarPreferenciasNotificaciones(preferencias) {
  const respuesta = await apiPut('/notificaciones/preferencias', preferencias);
  return respuesta.data;
}

window.obtenerNotificacionesSemilla = obtenerNotificacionesSemilla;
window.marcarNotificacionLeida = marcarNotificacionLeida;
window.marcarTodasNotificacionesLeidas = marcarTodasNotificacionesLeidas;
window.obtenerPreferenciasNotificaciones = obtenerPreferenciasNotificaciones;
window.actualizarPreferenciasNotificaciones = actualizarPreferenciasNotificaciones;
