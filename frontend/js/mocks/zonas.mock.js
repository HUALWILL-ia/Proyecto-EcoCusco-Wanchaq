/**
 * mocks/zonas.mock.js
 * FASE 2 — Ya no contiene datos simulados: cada función llama al backend
 * real (Express) manteniendo los mismos nombres que usaba la Fase 1 para
 * no romper el resto del frontend.
 */

/**
 * Devuelve la lista completa de zonas (GET /api/zonas — endpoint público,
 * se usa incluso antes de iniciar sesión, en el registro de ciudadanos).
 */
async function obtenerZonas() {
  const respuesta = await apiGet('/zonas', { autenticado: false });
  return respuesta.data;
}

/**
 * Busca una zona por su id.
 */
async function obtenerZonaPorId(id) {
  if (!id) return null;
  try {
    const respuesta = await apiGet(`/zonas/${id}`, { autenticado: false });
    return respuesta.data;
  } catch (err) {
    return null;
  }
}

/**
 * Busca una zona por nombre exacto (usada en selects de formularios).
 */
async function obtenerZonaPorNombre(nombre) {
  if (!nombre) return null;
  const zonas = await obtenerZonas();
  return zonas.find((z) => z.nombre === nombre) || null;
}

/**
 * Crea una nueva zona (admin).
 */
async function crearZona(datos) {
  const respuesta = await apiPost('/zonas', datos);
  return respuesta.data;
}

/**
 * Actualiza una zona existente (admin).
 */
async function actualizarZona(id, cambios) {
  const respuesta = await apiPut(`/zonas/${id}`, cambios);
  return respuesta.data;
}

/**
 * Elimina una zona (admin).
 */
async function eliminarZona(id) {
  await apiDelete(`/zonas/${id}`);
  return true;
}

window.obtenerZonas = obtenerZonas;
window.obtenerZonaPorId = obtenerZonaPorId;
window.obtenerZonaPorNombre = obtenerZonaPorNombre;
window.crearZona = crearZona;
window.actualizarZona = actualizarZona;
window.eliminarZona = eliminarZona;
