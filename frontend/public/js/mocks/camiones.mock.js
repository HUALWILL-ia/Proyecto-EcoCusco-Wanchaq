/**
 * mocks/camiones.mock.js
 * FASE 2 — Flota municipal servida por el backend real, incluye el
 * seguimiento GPS (simulado en el operador, real vía HTTP).
 */

async function obtenerCamiones() {
  const respuesta = await apiGet('/camiones');
  return respuesta.data;
}

/**
 * Camiones operativos y sin conflicto de asignación (admin) — para poblar el
 * selector "Camión asignado" al crear/reasignar un operador. Si se pasa
 * operadorId, incluye también el camión ya asignado a ese operador.
 */
async function obtenerCamionesDisponibles(operadorId) {
  const query = operadorId ? `?operadorId=${operadorId}` : '';
  const respuesta = await apiGet(`/camiones/disponibles${query}`);
  return respuesta.data;
}

async function obtenerCamionPorId(id) {
  if (!id) return null;
  try {
    const respuesta = await apiGet(`/camiones/${id}`);
    return respuesta.data;
  } catch (err) {
    return null;
  }
}

/**
 * Camión asignado al operador autenticado.
 */
async function obtenerMiCamion() {
  const respuesta = await apiGet('/camiones/mi-camion');
  return respuesta.data;
}

async function crearCamion(datos) {
  const respuesta = await apiPost('/camiones', datos);
  return respuesta.data;
}

async function actualizarCamion(id, cambios) {
  const respuesta = await apiPut(`/camiones/${id}`, cambios);
  return respuesta.data;
}

async function eliminarCamion(id) {
  await apiDelete(`/camiones/${id}`);
  return true;
}

/**
 * Actualiza la posición GPS real del camión del operador autenticado
 * (Fase 3 — geolocalización real del celular). rutaId/velocidad son
 * opcionales: si no se indica rutaId, el backend infiere la ruta en
 * progreso asignada al operador.
 */
async function actualizarGPS(lat, lng, opciones = {}) {
  const respuesta = await apiPost('/gps/actualizar', {
    lat,
    lng,
    velocidad: opciones.velocidad ?? null,
    rutaId: opciones.rutaId ?? undefined,
  });
  return respuesta.data;
}

/**
 * Posición actual del camión asignado a una ruta (admin).
 */
async function obtenerGPSPorRuta(rutaId) {
  const respuesta = await apiGet(`/gps/${rutaId}`);
  return respuesta.data;
}

/**
 * Posición actual de un camión por su id (ciudadano/admin) — no requiere
 * conocer la ruta, útil para el ciudadano que solo conoce el camión de su zona.
 */
async function obtenerGPSPorCamion(camionId) {
  const respuesta = await apiGet(`/gps/camion/${camionId}`);
  return respuesta.data;
}

/**
 * Posición actual de TODOS los camiones con ruta en curso, sin importar la
 * zona (mapa general del ciudadano — ver cualquier operador activo).
 */
async function obtenerGPSActivos() {
  const respuesta = await apiGet('/gps/activos');
  return respuesta.data;
}

window.obtenerCamiones = obtenerCamiones;
window.obtenerCamionesDisponibles = obtenerCamionesDisponibles;
window.obtenerCamionPorId = obtenerCamionPorId;
window.obtenerMiCamion = obtenerMiCamion;
window.crearCamion = crearCamion;
window.actualizarCamion = actualizarCamion;
window.eliminarCamion = eliminarCamion;
window.actualizarGPS = actualizarGPS;
window.obtenerGPSPorRuta = obtenerGPSPorRuta;
window.obtenerGPSPorCamion = obtenerGPSPorCamion;
window.obtenerGPSActivos = obtenerGPSActivos;
