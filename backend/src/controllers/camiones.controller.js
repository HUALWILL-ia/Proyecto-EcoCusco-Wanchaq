/**
 * controllers/camiones.controller.js
 * Flota municipal de camiones recolectores. Gestión exclusiva del admin;
 * la lectura también la usan operadores (su propio camión) y ciudadanos
 * (seguimiento GPS), por lo que listar/obtener quedan solo autenticados.
 */

const camionesRepo = require('../repositories/camiones.repository');
const usuariosRepo = require('../repositories/usuarios.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listar = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await camionesRepo.leerTodos() });
});

const obtenerPorId = asyncHandler(async (req, res) => {
  const camion = await camionesRepo.buscarPorId(req.params.id);
  if (!camion) throw ApiError.notFound('Camión no encontrado.');
  res.json({ success: true, data: camion });
});

const crear = asyncHandler(async (req, res) => {
  const nuevoCamion = await camionesRepo.crear(req.body);
  res.status(201).json({ success: true, message: 'Camión registrado correctamente.', data: nuevoCamion });
});

const actualizar = asyncHandler(async (req, res) => {
  const camion = await camionesRepo.buscarPorId(req.params.id);
  if (!camion) throw ApiError.notFound('Camión no encontrado.');

  const camposPermitidos = ['placa', 'modelo', 'capacidadKg', 'estado', 'zonaAsignada', 'operadorAsignado', 'nivelCombustible', 'ultimoMantenimiento'];
  const cambios = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  });

  const actualizado = await camionesRepo.actualizar(req.params.id, cambios);
  res.json({ success: true, message: 'Camión actualizado correctamente.', data: actualizado });
});

const eliminar = asyncHandler(async (req, res) => {
  const eliminado = await camionesRepo.eliminar(req.params.id);
  if (!eliminado) throw ApiError.notFound('Camión no encontrado.');
  res.json({ success: true, message: 'Camión eliminado correctamente.' });
});

/**
 * GET /api/camiones/disponibles (admin) — camiones operativos y sin
 * conflicto de asignación, para poblar el selector al crear/reasignar un
 * operador. ?operadorId=X incluye también el camión ya asignado a ese
 * operador (para que no desaparezca de la lista al reasignarlo).
 */
const obtenerDisponibles = asyncHandler(async (req, res) => {
  const { operadorId } = req.query;
  const disponibles = await camionesRepo.listarDisponibles(operadorId ? Number(operadorId) : null);
  res.json({ success: true, data: disponibles });
});

/**
 * GET /api/camiones/mi-camion (operador autenticado)
 */
const obtenerMiCamion = asyncHandler(async (req, res) => {
  const usuario = await usuariosRepo.buscarPorId(req.user.sub);
  if (!usuario?.camionAsignado) {
    return res.json({ success: true, data: null });
  }
  const camion = await camionesRepo.buscarPorId(usuario.camionAsignado);
  res.json({ success: true, data: camion });
});

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar, obtenerMiCamion, obtenerDisponibles };
