/**
 * utils/storage.js
 * Wrapper de localStorage para EcoRutas Wanchaq.
 *
 * FASE 2: el backend real (Express) es la única fuente de verdad de los
 * datos. En el navegador solo persiste la SESIÓN (token JWT + datos básicos
 * del usuario) y el estado efímero de la verificación en dos pasos.
 *
 * Las funciones getX()/setX() de más abajo se conservan con el mismo
 * nombre que usaban las pantallas de la Fase 1, pero ahora son async y
 * delegan en los módulos de js/mocks/*.js, que hacen fetch() real al backend.
 *
 * // FASE 3: la API pasará a leer/escribir en PostgreSQL (no cambia nada aquí).
 */

const STORAGE_KEYS = {
  SESION: 'ecoRutasWanchaq_sesion',
  DOS_FA_PENDIENTE: 'ecoRutasWanchaq_2fa_pendiente',
};

const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[storage] Error leyendo "${key}":`, err);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[storage] Error guardando "${key}":`, err);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clearAll() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

/**
 * FASE 1: sembraba los mocks en localStorage. FASE 2: ya no hay nada que
 * sembrar (el backend es la fuente de datos), pero se conserva la función
 * —como no-op— porque todas las páginas la invocan al cargar.
 */
function inicializarDatosSimulados() {
  // Intencionalmente vacío en Fase 2.
}

/* ---------------------------------------------------------------------- */
/* Accesores de datos — delegan en js/mocks/*.js (fetch real al backend)   */
/* ---------------------------------------------------------------------- */

async function getUsuarios() {
  return obtenerUsuariosSemilla();
}

async function setUsuarios() {
  console.warn('[storage] setUsuarios() ya no aplica en Fase 2: usa las funciones específicas (crearOperador, actualizarUsuario, cambiarEstadoUsuario).');
}

async function getIncidencias() {
  return obtenerIncidenciasSemilla();
}

async function setIncidencias() {
  console.warn('[storage] setIncidencias() ya no aplica en Fase 2: usa crearIncidencia() / actualizarEstadoIncidencia().');
}

async function getNotificaciones() {
  return obtenerNotificacionesSemilla();
}

async function setNotificaciones() {
  console.warn('[storage] setNotificaciones() ya no aplica en Fase 2: usa marcarNotificacionLeida() / marcarTodasNotificacionesLeidas().');
}

async function getRecolecciones() {
  const respuesta = await apiGet('/recolecciones?porPagina=1000');
  return respuesta.data;
}

async function setRecolecciones() {
  console.warn('[storage] setRecolecciones() ya no aplica en Fase 2: usa crearRecoleccion().');
}

async function crearRecoleccion(datos) {
  const respuesta = await apiPost('/recolecciones', datos);
  return respuesta.data;
}

async function obtenerMisRecolecciones() {
  const respuesta = await apiGet('/recolecciones/mis-recolecciones');
  return respuesta.data;
}

/**
 * Historial de recolecciones de la zona del ciudadano autenticado.
 * @param {{tipoResiduo?:string, desde?:string, hasta?:string, pagina?:number, porPagina?:number}} filtros
 */
async function obtenerHistorialReciclajeCiudadano(filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, valor);
  });
  const query = params.toString();
  return apiGet(`/recolecciones/mi-zona${query ? `?${query}` : ''}`);
}

async function getRutas() {
  return obtenerRutasSemilla();
}

async function setRutas() {
  console.warn('[storage] setRutas() ya no aplica en Fase 2: usa crearRuta()/actualizarRuta()/actualizarPuntoRuta().');
}

async function getRutaPorId(id) {
  return obtenerRutaPorId(id);
}

async function getRutasPorOperador() {
  return obtenerRutasPorOperador();
}

async function getCamionesStorage() {
  return obtenerCamiones();
}

async function setCamionesStorage() {
  console.warn('[storage] setCamionesStorage() ya no aplica en Fase 2: usa crearCamion()/actualizarCamion().');
}

async function getCamionPorIdStorage(id) {
  return obtenerCamionPorId(id);
}

async function getZonas() {
  return obtenerZonas();
}

async function setZonas() {
  console.warn('[storage] setZonas() ya no aplica en Fase 2: usa crearZona()/actualizarZona()/eliminarZona().');
}

async function getZonaPorId(id) {
  return obtenerZonaPorId(id);
}

async function getZonaPorNombre(nombre) {
  return obtenerZonaPorNombre(nombre);
}

async function getTiposResiduoLista() {
  return obtenerTiposResiduo();
}

async function setTiposResiduoLista() {
  console.warn('[storage] setTiposResiduoLista() ya no aplica en Fase 2: usa crearTipoResiduo()/actualizarTipoResiduo().');
}

/* ---------------------------------------------------------------------- */
/* Auditoría (Fase 3) — GET /api/auditoria, GET /api/incidencias/:id/historial */
/* ---------------------------------------------------------------------- */

async function obtenerAuditoria({ tabla, desde, hasta, pagina = 1, porPagina = 20 } = {}) {
  const parametros = new URLSearchParams();
  if (tabla) parametros.set('tabla', tabla);
  if (desde) parametros.set('desde', desde);
  if (hasta) parametros.set('hasta', hasta);
  parametros.set('pagina', pagina);
  parametros.set('porPagina', porPagina);

  const respuesta = await apiGet(`/auditoria?${parametros.toString()}`);
  return respuesta;
}

async function obtenerHistorialIncidencia(incidenciaId) {
  const respuesta = await apiGet(`/incidencias/${incidenciaId}/historial`);
  return respuesta.data;
}

/* ---------------------------------------------------------------------- */
/* Reportes / KPIs — GET /api/reportes/*                                  */
/* ---------------------------------------------------------------------- */

async function obtenerKpisAdmin() {
  const respuesta = await apiGet('/reportes/kpis-admin');
  return respuesta.data;
}

async function obtenerKpisCiudadano() {
  const respuesta = await apiGet('/reportes/kpis-ciudadano');
  return respuesta.data;
}

async function obtenerKpisOperador() {
  const respuesta = await apiGet('/reportes/kpis-operador');
  return respuesta.data;
}

function urlExportarReporte(formato) {
  return `${API_BASE_URL}/reportes/exportar/${formato}`;
}

/**
 * Descarga un reporte (PDF/Excel) autenticado: la API exige el header
 * Authorization, así que no se puede enlazar directo con <a href>; se pide
 * como blob y se dispara la descarga en el navegador.
 */
async function descargarReporte(formato, nombreArchivo) {
  const respuesta = await apiGet(`/reportes/exportar/${formato}`);
  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

window.STORAGE_KEYS = STORAGE_KEYS;
window.Storage = Storage;
window.inicializarDatosSimulados = inicializarDatosSimulados;
window.getUsuarios = getUsuarios;
window.setUsuarios = setUsuarios;
window.getIncidencias = getIncidencias;
window.setIncidencias = setIncidencias;
window.getNotificaciones = getNotificaciones;
window.setNotificaciones = setNotificaciones;
window.getRecolecciones = getRecolecciones;
window.setRecolecciones = setRecolecciones;
window.crearRecoleccion = crearRecoleccion;
window.obtenerMisRecolecciones = obtenerMisRecolecciones;
window.obtenerHistorialReciclajeCiudadano = obtenerHistorialReciclajeCiudadano;
window.getRutas = getRutas;
window.setRutas = setRutas;
window.getRutaPorId = getRutaPorId;
window.getRutasPorOperador = getRutasPorOperador;
window.getCamionesStorage = getCamionesStorage;
window.setCamionesStorage = setCamionesStorage;
window.getCamionPorIdStorage = getCamionPorIdStorage;
window.getZonas = getZonas;
window.setZonas = setZonas;
window.getZonaPorId = getZonaPorId;
window.getZonaPorNombre = getZonaPorNombre;
window.getTiposResiduoLista = getTiposResiduoLista;
window.setTiposResiduoLista = setTiposResiduoLista;
window.obtenerKpisAdmin = obtenerKpisAdmin;
window.obtenerKpisCiudadano = obtenerKpisCiudadano;
window.obtenerKpisOperador = obtenerKpisOperador;
window.urlExportarReporte = urlExportarReporte;
window.descargarReporte = descargarReporte;
window.obtenerAuditoria = obtenerAuditoria;
window.obtenerHistorialIncidencia = obtenerHistorialIncidencia;
