/**
 * controllers/recolecciones.controller.js
 * Registro diario de recolección (operador) e historial consolidado (admin).
 */

const recoleccionesRepo = require('../repositories/recolecciones.repository');
const rutasRepo = require('../repositories/rutas.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/recolecciones (operador)
 */
const crear = asyncHandler(async (req, res) => {
  const { rutaId, tipoResiduo, kg, observaciones } = req.body;

  const ruta = await rutasRepo.buscarPorId(rutaId);
  if (!ruta) throw ApiError.notFound('Ruta no encontrada.');
  if (ruta.operador !== req.user.sub) {
    throw ApiError.forbidden('Esta ruta no está asignada a tu usuario.');
  }

  const registro = await recoleccionesRepo.crear({
    operador: req.user.sub,
    rutaId: ruta.id,
    rutaNombre: ruta.nombre,
    tipoResiduo,
    kg: Number(kg),
    observaciones: observaciones || '',
  });

  res.status(201).json({ success: true, message: `Se registraron ${registro.kg} kg de ${tipoResiduo}.`, data: registro });
});

/**
 * GET /api/recolecciones (admin) — filtros: operador, tipoResiduo, desde, hasta + paginación
 */
const listar = asyncHandler(async (req, res) => {
  const { operador, tipoResiduo, desde, hasta, pagina = 1, porPagina = 10 } = req.query;

  let lista = await recoleccionesRepo.leerTodos();

  if (operador) lista = lista.filter((r) => String(r.operador) === String(operador));
  if (tipoResiduo) lista = lista.filter((r) => r.tipoResiduo === tipoResiduo);
  if (desde) lista = lista.filter((r) => new Date(r.fecha) >= new Date(desde));
  if (hasta) lista = lista.filter((r) => new Date(r.fecha) <= new Date(hasta));

  const total = lista.length;
  const paginaNum = Math.max(Number(pagina) || 1, 1);
  const porPaginaNum = Math.max(Number(porPagina) || 10, 1);
  const inicio = (paginaNum - 1) * porPaginaNum;
  const paginaLista = lista.slice(inicio, inicio + porPaginaNum);

  res.json({
    success: true,
    data: paginaLista,
    paginacion: { total, pagina: paginaNum, porPagina: porPaginaNum, totalPaginas: Math.ceil(total / porPaginaNum) },
  });
});

/**
 * GET /api/recolecciones/mis-recolecciones (operador) — registros del día del operador autenticado.
 */
const misRecolecciones = asyncHandler(async (req, res) => {
  const registros = await recoleccionesRepo.buscarPorOperador(req.user.sub);
  res.json({ success: true, data: registros });
});

module.exports = { crear, listar, misRecolecciones };
