/**
 * controllers/recolecciones.controller.js
 * Registro diario de recolección (operador) e historial consolidado (admin).
 */

const recoleccionesRepo = require('../repositories/recolecciones.repository');
const rutasRepo = require('../repositories/rutas.repository');
const usuariosRepo = require('../repositories/usuarios.repository');
const zonasRepo = require('../repositories/zonas.repository');
const camionesRepo = require('../repositories/camiones.repository');
const notificacionesRepo = require('../repositories/notificaciones.repository');
const { enviarCorreo } = require('../config/mailer');
const { plantillaRecoleccionRegistrada } = require('../utils/emailTemplates');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Notifica (adentro de la app + correo real) al ciudadano identificado como
 * generador de una recolección recién registrada.
 */
async function notificarCiudadano(ciudadano, ruta, registro) {
  const [zona, camion] = await Promise.all([
    ruta.zona ? zonasRepo.buscarPorId(ruta.zona) : null,
    ruta.camion ? camionesRepo.buscarPorId(ruta.camion) : null,
  ]);

  const zonaNombre = zona ? zona.nombre : ruta.nombre;
  const camionPlaca = camion ? camion.placa : null;

  await notificacionesRepo.crear({
    paraRol: 'ciudadano',
    paraUsuario: ciudadano.id,
    titulo: 'Se registró la recolección de tu residuo',
    mensaje: `${registro.tipoResiduo} — ${registro.kg} kg recolectados por ${camionPlaca || 'el camión de tu zona'} (${zonaNombre}).`,
    tipo: 'success',
  });

  await enviarCorreo({
    to: ciudadano.correo,
    subject: 'Se registró la recolección de tu residuo — EcoRutas Wanchaq',
    html: plantillaRecoleccionRegistrada(ciudadano.nombres, {
      tipoResiduo: registro.tipoResiduo,
      kg: registro.kg,
      fecha: registro.fecha,
      camionPlaca,
      zonaNombre,
    }),
  });
}

/**
 * POST /api/recolecciones (operador)
 */
const crear = asyncHandler(async (req, res) => {
  const { rutaId, usuarioId, tipoResiduo, kg, observaciones, fecha } = req.body;

  const ruta = await rutasRepo.buscarPorId(rutaId);
  if (!ruta) throw ApiError.notFound('Ruta no encontrada.');
  if (ruta.operador !== req.user.sub) {
    throw ApiError.forbidden('Esta ruta no está asignada a tu usuario.');
  }

  let ciudadano = null;
  if (usuarioId) {
    ciudadano = await usuariosRepo.buscarPorId(usuarioId);
    if (!ciudadano || ciudadano.rol !== 'ciudadano') {
      throw ApiError.badRequest('El ciudadano seleccionado no es válido.', 'CIUDADANO_INVALIDO');
    }
  }

  const registro = await recoleccionesRepo.crear({
    operador: req.user.sub,
    usuario: ciudadano ? ciudadano.id : null,
    rutaId: ruta.id,
    rutaNombre: ruta.nombre,
    tipoResiduo,
    kg: Number(kg),
    observaciones: observaciones || '',
    fecha: fecha || null,
  });

  if (ciudadano) {
    await notificarCiudadano(ciudadano, ruta, registro);
  }

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

/**
 * GET /api/recolecciones/mi-zona (ciudadano) — historial de recolecciones de
 * su zona de residencia. Filtros: tipoResiduo, desde, hasta + paginación.
 */
const misEnZona = asyncHandler(async (req, res) => {
  const { tipoResiduo, desde, hasta, pagina = 1, porPagina = 10 } = req.query;

  const usuario = await usuariosRepo.buscarPorId(req.user.sub);
  const paginaNum = Math.max(Number(pagina) || 1, 1);
  const porPaginaNum = Math.max(Number(porPagina) || 10, 1);

  if (!usuario || !usuario.zona) {
    return res.json({
      success: true,
      data: [],
      paginacion: { total: 0, pagina: paginaNum, porPagina: porPaginaNum, totalPaginas: 0 },
    });
  }

  let lista = await recoleccionesRepo.buscarPorZonaNombre(usuario.zona);

  if (tipoResiduo) lista = lista.filter((r) => r.tipoResiduo === tipoResiduo);
  if (desde) lista = lista.filter((r) => new Date(r.fecha) >= new Date(desde));
  if (hasta) lista = lista.filter((r) => new Date(r.fecha) <= new Date(hasta));

  const total = lista.length;
  const inicio = (paginaNum - 1) * porPaginaNum;
  const paginaLista = lista.slice(inicio, inicio + porPaginaNum);

  res.json({
    success: true,
    data: paginaLista,
    paginacion: { total, pagina: paginaNum, porPagina: porPaginaNum, totalPaginas: Math.ceil(total / porPaginaNum) },
  });
});

module.exports = { crear, listar, misRecolecciones, misEnZona };
