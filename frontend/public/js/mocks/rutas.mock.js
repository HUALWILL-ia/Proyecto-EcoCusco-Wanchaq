/**
 * mocks/rutas.mock.js
 * FASE 2 — Rutas de recolección servidas por el backend real.
 */

/**
 * Lista completa de rutas (admin). Se conserva el nombre usado en la Fase 1.
 */
async function obtenerRutasSemilla() {
  const respuesta = await apiGet('/rutas');
  return respuesta.data;
}

async function obtenerRutaPorId(id) {
  if (!id) return null;
  try {
    const respuesta = await apiGet(`/rutas/${id}`);
    return respuesta.data;
  } catch (err) {
    return null;
  }
}

/**
 * Rutas asignadas al operador autenticado (el backend las obtiene del JWT,
 * por eso el parámetro operadorId ya no es necesario, pero se mantiene
 * para no romper las llamadas existentes).
 */
async function obtenerRutasPorOperador() {
  const respuesta = await apiGet('/rutas/operador');
  return respuesta.data;
}

/**
 * Horario de recolección por zona (equivalente a las zonas, expuesto
 * también bajo /rutas/horarios para el ciudadano).
 */
async function obtenerHorarios() {
  const respuesta = await apiGet('/rutas/horarios');
  return respuesta.data;
}

async function crearRuta(datos) {
  const respuesta = await apiPost('/rutas', datos);
  return respuesta.data;
}

async function actualizarRuta(id, cambios) {
  const respuesta = await apiPut(`/rutas/${id}`, cambios);
  return respuesta.data;
}

async function eliminarRuta(id) {
  await apiDelete(`/rutas/${id}`);
  return true;
}

async function iniciarRuta(id) {
  const respuesta = await apiPost(`/rutas/${id}/iniciar`);
  return respuesta.data;
}

async function finalizarRuta(id, puntos) {
  const respuesta = await apiPost(`/rutas/${id}/finalizar`, puntos ? { puntos } : undefined);
  return respuesta.data;
}

/**
 * Marca (o desmarca) un punto de recolección de una ruta propia del operador.
 */
async function actualizarPuntoRuta(id, orden, completado) {
  const respuesta = await apiPatch(`/rutas/${id}/puntos/${orden}`, { completado });
  return respuesta.data;
}

/**
 * Trazado (polilínea de calles) de una ruta. Accesible a cualquier rol
 * autenticado, incluido ciudadano.
 */
async function obtenerTrazadoRuta(id) {
  const respuesta = await apiGet(`/rutas/${id}/trazado`);
  return respuesta.data;
}

/**
 * Puntos de recojo (orden, dirección, lat/lng, completado) de una ruta.
 * Mismo acceso que obtenerTrazadoRuta().
 */
async function obtenerPuntosRecojoRuta(id) {
  const respuesta = await apiGet(`/rutas/${id}/puntos-recojo`);
  return respuesta.data;
}

window.obtenerRutasSemilla = obtenerRutasSemilla;
window.obtenerRutaPorId = obtenerRutaPorId;
window.obtenerRutasPorOperador = obtenerRutasPorOperador;
window.obtenerHorarios = obtenerHorarios;
window.crearRuta = crearRuta;
window.actualizarRuta = actualizarRuta;
window.eliminarRuta = eliminarRuta;
window.iniciarRuta = iniciarRuta;
window.finalizarRuta = finalizarRuta;
window.actualizarPuntoRuta = actualizarPuntoRuta;
window.obtenerTrazadoRuta = obtenerTrazadoRuta;
window.obtenerPuntosRecojoRuta = obtenerPuntosRecojoRuta;
