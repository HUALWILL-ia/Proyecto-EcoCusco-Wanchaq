/**
 * controllers/incidencias.controller.js
 * Reporte de incidencias por ciudadanos y operadores (con foto opcional vía
 * multer y geolocalización opcional) y gestión centralizada por el admin.
 * El historial de cambios de estado lo genera automáticamente un trigger en
 * PostgreSQL (trg_historial_incidencias) — ver GET /:id/historial (auditoria.controller.js).
 */

const incidenciasRepo = require('../repositories/incidencias.repository');
const notificacionesRepo = require('../repositories/notificaciones.repository');
const usuariosRepo = require('../repositories/usuarios.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/incidencias (ciudadano/operador)
 */
const crear = asyncHandler(async (req, res) => {
  const { tipo, descripcion, zona, direccion, prioridad, lat, lng } = req.body;

  const nuevaIncidencia = await incidenciasRepo.crear({
    tipo,
    descripcion,
    zona,
    direccion,
    reportadoPor: req.user.sub,
    rolReporta: req.user.rol,
    estado: 'pendiente',
    prioridad: prioridad || 'media',
    fotoUrl: req.file ? `/uploads/${req.file.filename}` : null,
    geolocalizacion: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
    notasInternas: [],
  });

  // Notificación automática a la mesa administrativa (se notifica a todos los admins).
  const admins = await usuariosRepo.listarPorRol('admin');
  await Promise.all(admins.map((admin) => notificacionesRepo.crear({
    paraRol: 'admin',
    paraUsuario: admin.id,
    titulo: `Nueva incidencia: ${tipo}`,
    mensaje: `${nuevaIncidencia.zona} — ${nuevaIncidencia.direccion}`,
    tipo: nuevaIncidencia.prioridad === 'alta' ? 'warning' : 'info',
  })));

  res.status(201).json({ success: true, message: 'Tu incidencia fue registrada correctamente.', data: nuevaIncidencia });
});

/**
 * GET /api/incidencias (admin) — filtros: estado, prioridad, rolReporta + paginación
 */
const listar = asyncHandler(async (req, res) => {
  const { estado, prioridad, rolReporta, pagina = 1, porPagina = 8 } = req.query;

  let lista = await incidenciasRepo.leerTodos();
  if (estado) lista = lista.filter((i) => i.estado === estado);
  if (prioridad) lista = lista.filter((i) => i.prioridad === prioridad);
  if (rolReporta) lista = lista.filter((i) => i.rolReporta === rolReporta);

  const total = lista.length;
  const paginaNum = Math.max(Number(pagina) || 1, 1);
  const porPaginaNum = Math.max(Number(porPagina) || 8, 1);
  const inicio = (paginaNum - 1) * porPaginaNum;
  const paginaLista = lista.slice(inicio, inicio + porPaginaNum);

  res.json({
    success: true,
    data: paginaLista,
    paginacion: { total, pagina: paginaNum, porPagina: porPaginaNum, totalPaginas: Math.ceil(total / porPaginaNum) },
  });
});

/**
 * GET /api/incidencias/mis-incidencias (ciudadano/operador)
 */
const misIncidencias = asyncHandler(async (req, res) => {
  const lista = await incidenciasRepo.buscarPorUsuario(req.user.sub);
  res.json({ success: true, data: lista });
});

/**
 * PATCH /api/incidencias/:id/estado (admin) — actualiza estado y opcionalmente agrega nota interna.
 */
const actualizarEstado = asyncHandler(async (req, res) => {
  const incidencia = await incidenciasRepo.buscarPorId(req.params.id);
  if (!incidencia) throw ApiError.notFound('Incidencia no encontrada.');

  const { estado, nota } = req.body;
  const cambios = {};
  if (estado) cambios.estado = estado;
  if (nota) {
    cambios.notasInternas = [
      ...(incidencia.notasInternas || []),
      { texto: nota, autor: req.user.sub, fecha: new Date().toISOString() },
    ];
  }

  const actualizada = await incidenciasRepo.actualizar(req.params.id, cambios);

  if (estado && estado !== incidencia.estado) {
    await notificacionesRepo.crear({
      paraRol: incidencia.rolReporta,
      paraUsuario: incidencia.reportadoPor,
      titulo: 'Tu incidencia fue actualizada',
      mensaje: `${incidencia.id} — ${incidencia.tipo}: ahora está "${estado}".`,
      tipo: estado === 'resuelta' ? 'success' : 'info',
    });
  }

  res.json({ success: true, message: 'Incidencia actualizada correctamente.', data: actualizada });
});

/**
 * GET /api/incidencias/:id/historial (admin) — historial de estados
 * generado automáticamente por el trigger trg_historial_incidencias.
 */
const obtenerHistorial = asyncHandler(async (req, res) => {
  const incidencia = await incidenciasRepo.buscarPorId(req.params.id);
  if (!incidencia) throw ApiError.notFound('Incidencia no encontrada.');

  const historial = await incidenciasRepo.obtenerHistorial(req.params.id);
  res.json({ success: true, data: historial });
});

module.exports = { crear, listar, misIncidencias, actualizarEstado, obtenerHistorial };
