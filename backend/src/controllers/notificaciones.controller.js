/**
 * controllers/notificaciones.controller.js
 * Notificaciones por usuario y preferencias de envío.
 */

const notificacionesRepo = require('../repositories/notificaciones.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listar = asyncHandler(async (req, res) => {
  const lista = await notificacionesRepo.buscarPorUsuario(req.user.sub);
  res.json({ success: true, data: lista });
});

const marcarLeida = asyncHandler(async (req, res) => {
  const actualizada = await notificacionesRepo.marcarLeida(req.params.id, req.user.sub);
  if (!actualizada) throw ApiError.notFound('Notificación no encontrada.');
  res.json({ success: true, message: 'Notificación marcada como leída.', data: actualizada });
});

const marcarTodasLeidas = asyncHandler(async (req, res) => {
  const cambios = await notificacionesRepo.marcarTodasLeidas(req.user.sub);
  res.json({ success: true, message: `${cambios} notificación(es) marcadas como leídas.` });
});

const obtenerPreferencias = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notificacionesRepo.obtenerPreferencias(req.user.sub) });
});

const actualizarPreferencias = asyncHandler(async (req, res) => {
  const preferencias = await notificacionesRepo.guardarPreferencias(req.user.sub, req.body);
  res.json({ success: true, message: 'Preferencias actualizadas correctamente.', data: preferencias });
});

module.exports = { listar, marcarLeida, marcarTodasLeidas, obtenerPreferencias, actualizarPreferencias };
