/**
 * controllers/residuos.controller.js
 * Catálogo de tipos de residuo. Lectura pública, escritura exclusiva del admin.
 */

const residuosRepo = require('../repositories/residuos.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await residuosRepo.leerTodos() });
});

const crear = asyncHandler(async (req, res) => {
  const nuevoTipo = await residuosRepo.crear(req.body);
  res.status(201).json({ success: true, message: 'Tipo de residuo creado correctamente.', data: nuevoTipo });
});

const actualizar = asyncHandler(async (req, res) => {
  const tipo = await residuosRepo.buscarPorId(req.params.id);
  if (!tipo) throw ApiError.notFound('Tipo de residuo no encontrado.');

  const camposPermitidos = ['nombre', 'descripcion', 'color', 'icono', 'diasRecomendados', 'contenedor'];
  const cambios = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  });

  const actualizado = await residuosRepo.actualizar(req.params.id, cambios);
  res.json({ success: true, message: 'Tipo de residuo actualizado correctamente.', data: actualizado });
});

const eliminar = asyncHandler(async (req, res) => {
  const eliminado = await residuosRepo.eliminar(req.params.id);
  if (!eliminado) throw ApiError.notFound('Tipo de residuo no encontrado.');
  res.json({ success: true, message: 'Tipo de residuo eliminado correctamente.' });
});

module.exports = { listar, crear, actualizar, eliminar };
