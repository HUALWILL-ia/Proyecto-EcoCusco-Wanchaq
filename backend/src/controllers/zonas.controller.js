/**
 * controllers/zonas.controller.js
 * Catálogo de zonas de recolección. La lectura es pública (se usa en el
 * registro público de ciudadanos); la escritura es exclusiva del admin.
 */

const zonasRepo = require('../repositories/zonas.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await zonasRepo.leerTodos() });
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const zona = await zonasRepo.buscarPorId(req.params.id);
  if (!zona) throw ApiError.notFound('Zona no encontrada.');
  res.json({ success: true, data: zona });
});

const crear = asyncHandler(async (req, res) => {
  const nuevaZona = await zonasRepo.crear(req.body);
  res.status(201).json({ success: true, message: 'Zona creada correctamente.', data: nuevaZona });
});

const actualizar = asyncHandler(async (req, res) => {
  const zona = await zonasRepo.buscarPorId(req.params.id);
  if (!zona) throw ApiError.notFound('Zona no encontrada.');

  const camposPermitidos = ['nombre', 'descripcion', 'referencia', 'horarioRecoleccion', 'tipoResiduoPrincipal', 'contenedores', 'poblacionEstimada', 'estado'];
  const cambios = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  });

  const actualizada = await zonasRepo.actualizar(req.params.id, cambios);
  res.json({ success: true, message: 'Zona actualizada correctamente.', data: actualizada });
});

const eliminar = asyncHandler(async (req, res) => {
  const eliminada = await zonasRepo.eliminar(req.params.id);
  if (!eliminada) throw ApiError.notFound('Zona no encontrada.');
  res.json({ success: true, message: 'Zona eliminada correctamente.' });
});

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
