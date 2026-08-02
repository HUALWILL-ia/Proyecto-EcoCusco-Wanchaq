/**
 * controllers/rutas.controller.js
 * Planificación de rutas (admin), consulta operativa (operador) y
 * seguimiento GPS real (operador actualiza desde su celular, ciudadano/admin consultan).
 */

const rutasRepo = require('../repositories/rutas.repository');
const zonasRepo = require('../repositories/zonas.repository');
const camionesRepo = require('../repositories/camiones.repository');
const usuariosRepo = require('../repositories/usuarios.repository');
const gpsRepo = require('../repositories/ubicacionesGps.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await rutasRepo.leerTodos() });
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const ruta = await rutasRepo.buscarPorId(req.params.id);
  if (!ruta) throw ApiError.notFound('Ruta no encontrada.');
  res.json({ success: true, data: ruta });
});

const crear = asyncHandler(async (req, res) => {
  const { nombre, zona, camion, operador, turno, puntos } = req.body;

  const listaPuntos = Array.isArray(puntos) && puntos.length > 0
    ? puntos.map((direccion, i) => (typeof direccion === 'string'
      ? { orden: i + 1, direccion, completado: false }
      : { orden: i + 1, completado: false, ...direccion }))
    : [];

  const nuevaRuta = await rutasRepo.crear({
    nombre,
    zona: zona || null,
    camion: camion || null,
    operador: operador || null,
    turno: turno || '',
    estado: 'pendiente',
    puntos: listaPuntos,
    progreso: 0,
  });

  res.status(201).json({ success: true, message: 'Ruta creada correctamente.', data: nuevaRuta });
});

const actualizar = asyncHandler(async (req, res) => {
  const ruta = await rutasRepo.buscarPorId(req.params.id);
  if (!ruta) throw ApiError.notFound('Ruta no encontrada.');

  const cambios = {};
  ['nombre', 'zona', 'camion', 'operador', 'turno', 'estado', 'progreso'].forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  });

  if (Array.isArray(req.body.puntos)) {
    cambios.puntos = req.body.puntos;
    const total = cambios.puntos.length;
    const hechos = cambios.puntos.filter((p) => p.completado).length;
    cambios.progreso = total > 0 ? Math.round((hechos / total) * 100) : 0;
    cambios.estado = cambios.progreso === 100 ? 'completada' : cambios.progreso > 0 ? 'en_progreso' : 'pendiente';
  }

  const actualizada = await rutasRepo.actualizar(req.params.id, cambios);
  res.json({ success: true, message: 'Ruta actualizada correctamente.', data: actualizada });
});

const eliminar = asyncHandler(async (req, res) => {
  const eliminada = await rutasRepo.eliminar(req.params.id);
  if (!eliminada) throw ApiError.notFound('Ruta no encontrada.');
  res.json({ success: true, message: 'Ruta eliminada correctamente.' });
});

/**
 * GET /api/rutas/horarios (ciudadano) — horario de recolección por zona.
 */
const obtenerHorarios = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await zonasRepo.leerTodos() });
});

/**
 * GET /api/rutas/operador (operador autenticado)
 */
const obtenerPorOperador = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await rutasRepo.buscarPorOperador(req.user.sub) });
});

function recalcularProgreso(ruta) {
  const total = ruta.puntos.length;
  const hechos = ruta.puntos.filter((p) => p.completado).length;
  return total > 0 ? Math.round((hechos / total) * 100) : 0;
}

/**
 * POST /api/rutas/:id/iniciar (operador)
 */
const iniciar = asyncHandler(async (req, res) => {
  const ruta = await rutasRepo.buscarPorId(req.params.id);
  if (!ruta) throw ApiError.notFound('Ruta no encontrada.');
  if (ruta.operador !== req.user.sub) throw ApiError.forbidden('Esta ruta no está asignada a tu usuario.');

  const actualizada = await rutasRepo.actualizar(ruta.id, { estado: 'en_progreso' });
  res.json({ success: true, message: 'Ruta iniciada.', data: actualizada });
});

/**
 * POST /api/rutas/:id/finalizar (operador) — también acepta actualizar puntos completados.
 */
const finalizar = asyncHandler(async (req, res) => {
  const ruta = await rutasRepo.buscarPorId(req.params.id);
  if (!ruta) throw ApiError.notFound('Ruta no encontrada.');
  if (ruta.operador !== req.user.sub) throw ApiError.forbidden('Esta ruta no está asignada a tu usuario.');

  let puntos = ruta.puntos;
  if (Array.isArray(req.body.puntos)) puntos = req.body.puntos;

  const actualizada = await rutasRepo.actualizar(ruta.id, { puntos, progreso: 100, estado: 'completada' });
  res.json({ success: true, message: 'Ruta finalizada.', data: actualizada });
});

/**
 * PATCH /api/rutas/:id/puntos/:orden (operador) — marca/desmarca un punto de recolección.
 */
const actualizarPunto = asyncHandler(async (req, res) => {
  const ruta = await rutasRepo.buscarPorId(req.params.id);
  if (!ruta) throw ApiError.notFound('Ruta no encontrada.');
  if (ruta.operador !== req.user.sub) throw ApiError.forbidden('Esta ruta no está asignada a tu usuario.');

  const orden = Number(req.params.orden);
  const punto = ruta.puntos.find((p) => p.orden === orden);
  if (!punto) throw ApiError.notFound('Punto de recolección no encontrado.');

  punto.completado = Boolean(req.body.completado);
  const progreso = recalcularProgreso(ruta);
  const estado = progreso === 100 ? 'completada' : progreso > 0 ? 'en_progreso' : 'pendiente';

  const actualizada = await rutasRepo.actualizar(ruta.id, { puntos: ruta.puntos, progreso, estado });
  res.json({ success: true, message: 'Punto actualizado.', data: actualizada });
});

/**
 * POST /api/gps/actualizar (operador) — actualiza la ubicación real del camión
 * asignado, recibida desde la geolocalización del celular del operador.
 * Guarda/actualiza (UPSERT) en ubicaciones_gps y difunde el cambio por Socket.IO.
 */
const actualizarGPS = asyncHandler(async (req, res) => {
  const { lat, lng, velocidad, rutaId } = req.body;
  if (lat === undefined || lng === undefined) {
    throw ApiError.badRequest('Faltan las coordenadas (lat, lng).', 'GPS_INCOMPLETO');
  }

  const usuario = await usuariosRepo.buscarPorId(req.user.sub);
  if (!usuario?.camionAsignado) {
    throw ApiError.badRequest('No tienes un camión asignado.', 'SIN_CAMION');
  }

  // La ruta se puede indicar explícitamente (celular del operador) o se infiere
  // de la ruta en_progreso asignada a este operador.
  let ruta = rutaId ? await rutasRepo.buscarPorId(rutaId) : null;
  if (!ruta) {
    const rutas = await rutasRepo.buscarPorOperador(req.user.sub);
    ruta = rutas.find((r) => r.estado === 'en_progreso') || rutas[0] || null;
  }
  if (!ruta) {
    throw ApiError.badRequest('No tienes una ruta activa para transmitir tu ubicación.', 'SIN_RUTA_ACTIVA');
  }

  const ubicacion = await gpsRepo.upsert({
    rutaId: ruta.id,
    camionId: usuario.camionAsignado,
    operadorId: usuario.id,
    lat: Number(lat),
    lng: Number(lng),
    velocidad: velocidad !== undefined ? Number(velocidad) : null,
  });

  // Mantiene también el campo "de referencia" en camiones (lo usan el listado
  // simple de camiones y el mapa del ciudadano al hacer polling por camión).
  const camionActualizado = await camionesRepo.actualizar(usuario.camionAsignado, {
    ubicacionActual: { lat: ubicacion.lat, lng: ubicacion.lng },
  });
  ubicacion.placa = camionActualizado.placa;
  ubicacion.modelo = camionActualizado.modelo;
  ubicacion.camionEstado = camionActualizado.estado;

  // Zona que cubre esta ruta: la necesita el mapa general del ciudadano
  // (todas las rutas activas, no solo la suya) para mostrarla en el popup.
  if (ruta.zona) {
    const zona = await zonasRepo.buscarPorId(ruta.zona);
    ubicacion.zonaId = ruta.zona;
    ubicacion.zonaNombre = zona ? zona.nombre : null;
  }

  const io = req.app.get('io');
  if (io) {
    // Se emite a tres salas: por ruta (la usa el admin), por camión (el
    // ciudadano que solo conoce el camión de su zona) y "gps:activos" (el
    // mapa general del ciudadano, que ve a CUALQUIER operador transmitiendo,
    // sin importar la zona).
    io.to(`ruta:${ruta.id}`).to(`camion:${usuario.camionAsignado}`).to('gps:activos').emit('gps:actualizacion', ubicacion);
  }

  res.json({ success: true, message: 'Ubicación actualizada.', data: ubicacion });
});

/**
 * GET /api/gps/:rutaId (admin) — última posición conocida del camión de una ruta.
 */
const obtenerGPSPorRuta = asyncHandler(async (req, res) => {
  const ubicacion = await gpsRepo.obtenerPorRuta(req.params.rutaId);
  res.json({ success: true, data: ubicacion });
});

/**
 * GET /api/gps/camion/:camionId (ciudadano/admin) — última posición conocida de un camión.
 */
const obtenerGPSPorCamion = asyncHandler(async (req, res) => {
  const ubicacion = await gpsRepo.obtenerPorCamion(req.params.camionId);
  res.json({ success: true, data: ubicacion });
});

/**
 * GET /api/gps/activos — última posición conocida de TODOS los camiones con
 * ruta en_progreso en este momento, sin importar su zona. La usa el mapa
 * general del ciudadano (ver cualquier operador activo, no solo el de su
 * propia zona); admin/operador pueden reusarlo igual si lo necesitan.
 */
const obtenerGPSActivos = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await gpsRepo.obtenerActivas() });
});

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerHorarios,
  obtenerPorOperador,
  iniciar,
  finalizar,
  actualizarPunto,
  actualizarGPS,
  obtenerGPSPorRuta,
  obtenerGPSPorCamion,
  obtenerGPSActivos,
};
