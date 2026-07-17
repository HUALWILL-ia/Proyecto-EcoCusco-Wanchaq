/**
 * controllers/usuarios.controller.js
 * Gestión de usuarios (admin), perfil propio (cualquier rol autenticado) y
 * alta exclusiva de operadores (admin) con envío real de credenciales.
 */

const bcrypt = require('bcryptjs');

const usuariosRepo = require('../repositories/usuarios.repository');
const zonasRepo = require('../repositories/zonas.repository');
const camionesRepo = require('../repositories/camiones.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const generarPasswordTemporal = require('../utils/generarPasswordTemporal');
const { enviarCorreo } = require('../config/mailer');
const { plantillaCredencialesOperador } = require('../utils/emailTemplates');

const RONDAS_BCRYPT = 10;

/**
 * GET /api/usuarios (admin) — filtros: rol, estado, texto (nombre/dni/correo) + paginación
 */
const listar = asyncHandler(async (req, res) => {
  const { rol, estado, texto = '', pagina = 1, porPagina = 10 } = req.query;

  let lista = await usuariosRepo.leerTodos();

  if (rol) lista = lista.filter((u) => u.rol === rol);
  if (estado) lista = lista.filter((u) => u.estado === estado);
  if (texto) {
    const t = texto.toLowerCase();
    lista = lista.filter(
      (u) =>
        `${u.nombres} ${u.apellidos}`.toLowerCase().includes(t) ||
        u.dni.includes(t) ||
        u.correo.toLowerCase().includes(t)
    );
  }

  const total = lista.length;
  const paginaNum = Math.max(Number(pagina) || 1, 1);
  const porPaginaNum = Math.max(Number(porPagina) || 10, 1);
  const inicio = (paginaNum - 1) * porPaginaNum;
  const paginaLista = lista.slice(inicio, inicio + porPaginaNum).map(usuariosRepo.aPublico);

  res.json({
    success: true,
    data: paginaLista,
    paginacion: { total, pagina: paginaNum, porPagina: porPaginaNum, totalPaginas: Math.ceil(total / porPaginaNum) },
  });
});

/**
 * POST /api/usuarios/operadores (admin) — única vía para crear operadores.
 */
const crearOperador = asyncHandler(async (req, res) => {
  const { nombres, apellidos, dni, correo, telefono, zonaAsignada, camionAsignado } = req.body;

  if (await usuariosRepo.existeCorreo(correo)) {
    throw ApiError.conflict('Ya existe una cuenta registrada con este correo.', 'CORREO_DUPLICADO');
  }
  if (await usuariosRepo.existeDni(dni)) {
    throw ApiError.conflict('Ya existe una cuenta registrada con este DNI.', 'DNI_DUPLICADO');
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await bcrypt.hash(passwordTemporal, RONDAS_BCRYPT);

  const nuevoOperador = await usuariosRepo.crear({
    rol: 'operador',
    nombres,
    apellidos,
    cargo: 'Operador de Recolección - Flota Municipal',
    dni: dni.trim(),
    correo: correo.trim().toLowerCase(),
    passwordHash,
    telefono: telefono || '',
    camionAsignado: camionAsignado || null,
    zonaAsignada: zonaAsignada || null,
    estado: 'activo',
    creadoPor: req.user.sub,
    requiere2FA: true,
    debeCambiarPassword: true,
  });

  await enviarCorreo({
    to: nuevoOperador.correo,
    subject: 'Tu cuenta de operador — EcoRutas Wanchaq',
    html: plantillaCredencialesOperador(nuevoOperador.nombres, nuevoOperador.correo, passwordTemporal),
  });

  res.status(201).json({
    success: true,
    message: `Se creó la cuenta y se enviaron las credenciales a ${nuevoOperador.correo}.`,
    data: { usuario: usuariosRepo.aPublico(nuevoOperador) },
  });
});

/**
 * PUT /api/usuarios/:id (admin)
 */
const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const usuario = await usuariosRepo.buscarPorId(id);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado.');

  const camposPermitidos = ['nombres', 'apellidos', 'telefono', 'zonaAsignada', 'camionAsignado', 'zona', 'direccion'];
  const cambios = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  });

  const actualizado = await usuariosRepo.actualizar(id, cambios);
  res.json({ success: true, message: 'Usuario actualizado correctamente.', data: { usuario: usuariosRepo.aPublico(actualizado) } });
});

/**
 * PATCH /api/usuarios/:id/estado (admin)
 */
const cambiarEstado = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.sub) {
    throw ApiError.badRequest('No puedes cambiar el estado de tu propia cuenta.', 'ACCION_NO_PERMITIDA');
  }

  const usuario = await usuariosRepo.buscarPorId(id);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado.');

  const nuevoEstado = usuario.estado === 'activo' ? 'inactivo' : 'activo';
  const actualizado = await usuariosRepo.actualizar(id, { estado: nuevoEstado });

  res.json({ success: true, message: `La cuenta ahora está ${nuevoEstado}.`, data: { usuario: usuariosRepo.aPublico(actualizado) } });
});

/**
 * PUT /api/usuarios/:id/zona (admin) — reasigna zona a un ciudadano u operador
 */
const asignarZona = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { zona, zonaId } = req.body;

  const usuario = await usuariosRepo.buscarPorId(id);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado.');

  const cambios = usuario.rol === 'operador' ? { zonaAsignada: zonaId || zona } : { zona };
  const actualizado = await usuariosRepo.actualizar(id, cambios);

  res.json({ success: true, message: 'Zona reasignada correctamente.', data: { usuario: usuariosRepo.aPublico(actualizado) } });
});

/**
 * GET /api/usuarios/perfil
 */
const obtenerPerfil = asyncHandler(async (req, res) => {
  const usuario = await usuariosRepo.buscarPorId(req.user.sub);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado.');

  const extra = {};
  if (usuario.rol === 'operador' && usuario.zonaAsignada) {
    extra.zonaInfo = await zonasRepo.buscarPorId(usuario.zonaAsignada);
    extra.camionInfo = usuario.camionAsignado ? await camionesRepo.buscarPorId(usuario.camionAsignado) : null;
  }

  res.json({ success: true, data: { usuario: usuariosRepo.aPublico(usuario), ...extra } });
});

/**
 * PUT /api/usuarios/perfil
 */
const actualizarPerfil = asyncHandler(async (req, res) => {
  const camposPermitidos = ['telefono', 'zona', 'direccion'];
  const cambios = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  });

  const actualizado = await usuariosRepo.actualizar(req.user.sub, cambios);
  res.json({ success: true, message: 'Perfil actualizado correctamente.', data: { usuario: usuariosRepo.aPublico(actualizado) } });
});

/**
 * PUT /api/usuarios/perfil/password
 */
const cambiarPasswordPerfil = asyncHandler(async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;

  const usuario = await usuariosRepo.buscarPorId(req.user.sub);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado.');

  const coincide = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!coincide) {
    throw ApiError.badRequest('La contraseña actual no es correcta.', 'PASSWORD_INCORRECTA');
  }

  const passwordHash = await bcrypt.hash(passwordNueva, RONDAS_BCRYPT);
  await usuariosRepo.actualizar(usuario.id, { passwordHash, debeCambiarPassword: false });

  res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
});

module.exports = {
  listar,
  crearOperador,
  actualizar,
  cambiarEstado,
  asignarZona,
  obtenerPerfil,
  actualizarPerfil,
  cambiarPasswordPerfil,
};
