/**
 * controllers/auditoria.controller.js
 * Lectura de la auditoría generada automáticamente por los triggers de
 * PostgreSQL (solo admin). Es una capa de solo-lectura sobre la tabla
 * `auditoria` (ver baseDatos_eccoCusco.sql).
 */

const auditoriaRepo = require('../repositories/auditoria.repository');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/auditoria (admin) — filtros: tabla, desde, hasta + paginación
 */
const listar = asyncHandler(async (req, res) => {
  const { tabla, desde, hasta, pagina = 1, porPagina = 20 } = req.query;

  const { datos, paginacion } = await auditoriaRepo.listar({ tabla, desde, hasta, pagina, porPagina });
  const tablasDisponibles = await auditoriaRepo.listarTablasDisponibles();

  res.json({ success: true, data: datos, paginacion, tablasDisponibles });
});

module.exports = { listar };
