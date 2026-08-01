/**
 * utils/api.js
 * Fase 2 — Cliente HTTP hacia el backend real de EcoRutas Wanchaq
 * (Node.js + Express). Todos los módulos de mocks/ y auth-simulado.js pasan
 * por aquí en lugar de tocar localStorage/arreglos falsos directamente.
 *
 * Guarda el JWT en la misma clave de localStorage que ya usaba la Fase 1
 * (STORAGE_KEYS.SESION, definida en utils/storage.js) para no romper nada
 * de lo que dependía de esa sesión.
 */

// En localhost (desarrollo) apunta al backend local. En cualquier otro
// dominio (producción) apunta al backend desplegado en Render — actualiza
// esta URL cuando tengas la definitiva (ver backend/README.md, sección
// "Desplegar con HTTPS").
const ES_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = ES_LOCAL
  ? 'http://localhost:4000/api'
  : 'https://ecorutas-wanchaq-api.onrender.com/api';

/**
 * Lee el token JWT actual desde la sesión guardada en localStorage.
 */
function obtenerTokenActual() {
  const sesion = Storage.get(STORAGE_KEYS.SESION, null);
  return sesion?.token || null;
}

/**
 * Si el backend responde 401/403, la sesión ya no es válida: se limpia y
 * se redirige a login.html (respetando la profundidad de carpeta actual).
 */
function manejarSesionInvalida() {
  Storage.remove(STORAGE_KEYS.SESION);
  const destino = `${rutaBaseRelativa()}login.html`;
  if (!window.location.pathname.endsWith('/login.html')) {
    window.location.href = destino;
  }
}

/**
 * Petición genérica a la API. Lanza un Error con .mensaje y .code en caso
 * de fallo para que las pantallas puedan mostrar el mensaje real del backend.
 *
 * @param {string} ruta - ej. '/zonas', '/auth/login'
 * @param {object} opciones
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [opciones.method]
 * @param {object} [opciones.body] - se serializa como JSON (o se envía tal cual si es FormData)
 * @param {boolean} [opciones.autenticado] - agrega el header Authorization (por defecto true)
 */
async function apiRequest(ruta, opciones = {}) {
  const { method = 'GET', body, autenticado = true } = opciones;

  const headers = {};
  const esFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body && !esFormData) headers['Content-Type'] = 'application/json';

  if (autenticado) {
    const token = obtenerTokenActual();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      method,
      headers,
      body: body ? (esFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    const error = new Error('No se pudo conectar con el servidor de EcoRutas Wanchaq. Verifica tu conexión.');
    error.code = 'SIN_CONEXION';
    throw error;
  }

  if (respuesta.status === 401 || respuesta.status === 403) {
    let cuerpo = null;
    try { cuerpo = await respuesta.json(); } catch (_) { /* respuesta sin cuerpo JSON */ }
    manejarSesionInvalida();
    const error = new Error(cuerpo?.message || 'Tu sesión expiró. Inicia sesión nuevamente.');
    error.code = cuerpo?.code || 'NO_AUTORIZADO';
    error.status = respuesta.status;
    throw error;
  }

  // Descargas binarias (PDF/Excel) — el llamador decide qué hacer con la respuesta.
  const tipoContenido = respuesta.headers.get('content-type') || '';
  if (!tipoContenido.includes('application/json')) {
    if (!respuesta.ok) {
      const error = new Error('Ocurrió un error al procesar el archivo solicitado.');
      error.status = respuesta.status;
      throw error;
    }
    return respuesta;
  }

  const datos = await respuesta.json();

  if (!respuesta.ok || datos.success === false) {
    const error = new Error(datos.message || 'Ocurrió un error inesperado.');
    error.code = datos.code;
    error.status = respuesta.status;
    error.detalles = datos.detalles;
    throw error;
  }

  return datos;
}

const apiGet = (ruta, opciones) => apiRequest(ruta, { ...opciones, method: 'GET' });
const apiPost = (ruta, body, opciones) => apiRequest(ruta, { ...opciones, method: 'POST', body });
const apiPut = (ruta, body, opciones) => apiRequest(ruta, { ...opciones, method: 'PUT', body });
const apiPatch = (ruta, body, opciones) => apiRequest(ruta, { ...opciones, method: 'PATCH', body });
const apiDelete = (ruta, opciones) => apiRequest(ruta, { ...opciones, method: 'DELETE' });

/**
 * Convierte una ruta relativa devuelta por la API (ej. "/uploads/foto.jpg",
 * fotos de perfil o de incidencias) en una URL absoluta hacia el backend.
 */
function urlArchivo(rutaRelativa) {
  if (!rutaRelativa) return null;
  if (/^https?:\/\//.test(rutaRelativa)) return rutaRelativa;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${rutaRelativa}`;
}

window.API_BASE_URL = API_BASE_URL;
window.urlArchivo = urlArchivo;
window.apiRequest = apiRequest;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiPatch = apiPatch;
window.apiDelete = apiDelete;
