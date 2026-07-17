/**
 * controllers/auth.controller.js
 * Registro de ciudadanos, login con ramificación por rol, verificación 2FA
 * real por correo (operador/admin, persistida en PostgreSQL) y sesión
 * (logout stateless / me).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const usuariosRepo = require('../repositories/usuarios.repository');
const codigos2faRepo = require('../repositories/codigos2fa.repository');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const generarCodigo2FA = require('../utils/generarCodigo2FA');
const { enviarCorreo } = require('../config/mailer');
const { plantillaCodigo2FA } = require('../utils/emailTemplates');

const RONDAS_BCRYPT = 10;

function firmarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, rol: usuario.rol, correo: usuario.correo, nombres: usuario.nombres, apellidos: usuario.apellidos },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

async function enviarCodigo2FA(usuario) {
  const codigo = generarCodigo2FA();
  await codigos2faRepo.guardar(usuario.id, codigo);
  await enviarCorreo({
    to: usuario.correo,
    subject: 'Tu código de verificación — EcoRutas Wanchaq',
    html: plantillaCodigo2FA(usuario.nombres, codigo, codigos2faRepo.DURACION_MINUTOS),
  });
}

/**
 * POST /api/auth/registro-ciudadano
 */
const registroCiudadano = asyncHandler(async (req, res) => {
  const { correo, password, dni, zona, nombres, apellidos, telefono, direccion } = req.body;

  if (await usuariosRepo.existeCorreo(correo)) {
    throw ApiError.conflict('Ya existe una cuenta registrada con este correo.', 'CORREO_DUPLICADO');
  }
  if (await usuariosRepo.existeDni(dni)) {
    throw ApiError.conflict('Ya existe una cuenta registrada con este DNI.', 'DNI_DUPLICADO');
  }

  const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);

  const nuevoUsuario = await usuariosRepo.crear({
    rol: 'ciudadano',
    nombres: nombres || 'Vecino',
    apellidos: apellidos || 'de Wanchaq',
    dni: dni.trim(),
    correo: correo.trim().toLowerCase(),
    passwordHash,
    telefono: telefono || '',
    zona,
    direccion: direccion || '',
    estado: 'activo',
    nivelEcologico: 'Eco Semilla',
    kgReciclados: 0,
  });

  const token = firmarToken(nuevoUsuario);
  res.status(201).json({
    success: true,
    message: `Bienvenido a EcoRutas Wanchaq, vecino de ${zona}.`,
    data: { token, usuario: usuariosRepo.aPublico(nuevoUsuario) },
  });
});

/**
 * POST /api/auth/login
 * Ciudadano: devuelve JWT directo. Operador/Admin: dispara 2FA por correo.
 */
const login = asyncHandler(async (req, res) => {
  const { identificador, password } = req.body;

  const usuario = await usuariosRepo.buscarPorCorreoODni(identificador);
  if (!usuario) {
    throw ApiError.unauthorized('No se encontró una cuenta con ese correo o DNI.', 'CREDENCIALES_INVALIDAS');
  }

  const coincide = await bcrypt.compare(password, usuario.passwordHash);
  if (!coincide) {
    throw ApiError.unauthorized('Contraseña incorrecta. Inténtalo nuevamente.', 'CREDENCIALES_INVALIDAS');
  }

  if (usuario.estado === 'inactivo') {
    throw ApiError.forbidden('Tu cuenta se encuentra inactiva. Contacta a la municipalidad.', 'CUENTA_INACTIVA');
  }

  if (usuario.rol === 'ciudadano') {
    const token = firmarToken(usuario);
    return res.json({
      success: true,
      message: `Bienvenido, ${usuario.nombres}.`,
      data: { requiere2FA: false, token, usuario: usuariosRepo.aPublico(usuario) },
    });
  }

  // Operador / Admin -> requiere 2FA real por correo
  await enviarCodigo2FA(usuario);
  res.json({
    success: true,
    message: `Se envió un código de verificación a ${usuario.correo}.`,
    data: { requiere2FA: true, correo: usuario.correo },
  });
});

/**
 * POST /api/auth/verificar-2fa
 */
const verificar2FA = asyncHandler(async (req, res) => {
  const { correo, codigo } = req.body;

  const usuario = await usuariosRepo.buscarPorCorreo(correo);
  if (!usuario) {
    throw ApiError.notFound('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO');
  }

  const pendiente = await codigos2faRepo.obtenerVigente(usuario.id);
  if (!pendiente) {
    throw ApiError.badRequest('El código expiró o no hay una verificación pendiente. Inicia sesión nuevamente.', 'CODIGO_EXPIRADO');
  }
  if (pendiente.codigo !== codigo.trim()) {
    throw ApiError.badRequest('Código incorrecto. Verifica los 6 dígitos.', 'CODIGO_INCORRECTO');
  }

  await codigos2faRepo.marcarUsado(pendiente.id);
  const token = firmarToken(usuario);
  res.json({
    success: true,
    message: `Bienvenido, ${usuario.nombres}.`,
    data: { token, usuario: usuariosRepo.aPublico(usuario) },
  });
});

/**
 * POST /api/auth/reenviar-2fa
 */
const reenviar2FA = asyncHandler(async (req, res) => {
  const { correo } = req.body;

  const usuario = await usuariosRepo.buscarPorCorreo(correo);
  if (!usuario) {
    throw ApiError.notFound('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO');
  }

  await enviarCodigo2FA(usuario);
  res.json({ success: true, message: `Se reenvió un nuevo código a ${usuario.correo}.` });
});

/**
 * POST /api/auth/logout
 * El JWT es stateless: no hay nada que invalidar en el servidor en esta fase.
 * El frontend simplemente descarta el token guardado.
 */
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Sesión cerrada correctamente.' });
});

/**
 * GET /api/auth/me
 */
const me = asyncHandler(async (req, res) => {
  const usuario = await usuariosRepo.buscarPorId(req.user.sub);
  if (!usuario) {
    throw ApiError.notFound('Usuario no encontrado.', 'USUARIO_NO_ENCONTRADO');
  }
  res.json({ success: true, data: { usuario: usuariosRepo.aPublico(usuario) } });
});

module.exports = { registroCiudadano, login, verificar2FA, reenviar2FA, logout, me };
