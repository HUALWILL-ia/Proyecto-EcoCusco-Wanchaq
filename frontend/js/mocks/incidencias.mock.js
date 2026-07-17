/**
 * mocks/incidencias.mock.js
 * FASE 2 — Incidencias reportadas, servidas por el backend real
 * (con soporte de foto adjunta vía multer y geolocalización opcional).
 */

/**
 * Lista completa de incidencias (admin). Se conserva el nombre de la Fase 1.
 */
async function obtenerIncidenciasSemilla() {
  const respuesta = await apiGet('/incidencias?porPagina=1000');
  return respuesta.data;
}

/**
 * Incidencias reportadas por el usuario autenticado (ciudadano u operador).
 */
async function obtenerMisIncidencias() {
  const respuesta = await apiGet('/incidencias/mis-incidencias');
  return respuesta.data;
}

/**
 * Crea una incidencia. Acepta un objeto plano (sin foto) o un FormData
 * (cuando se adjunta una imagen) construido por la propia página.
 */
async function crearIncidencia(datos) {
  // apiPost detecta automáticamente si "datos" es un FormData (con foto) o un objeto plano.
  const respuesta = await apiPost('/incidencias', datos);
  return respuesta.data;
}

/**
 * Actualiza el estado (y opcionalmente agrega una nota interna) de una
 * incidencia (admin).
 */
async function actualizarEstadoIncidencia(id, { estado, nota } = {}) {
  const respuesta = await apiPatch(`/incidencias/${id}/estado`, { estado, nota });
  return respuesta.data;
}

window.obtenerIncidenciasSemilla = obtenerIncidenciasSemilla;
window.obtenerMisIncidencias = obtenerMisIncidencias;
window.crearIncidencia = crearIncidencia;
window.actualizarEstadoIncidencia = actualizarEstadoIncidencia;
