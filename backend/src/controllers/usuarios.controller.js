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
const { plantillaCredencialesOperador, plantillaCredencialesAdmin } = require('../utils/emailTemplates');

const RONDAS_BCRYPT = 10;

/**
 * Valida que un camión pueda asignarse a un operador: debe existir, estar
 * operativo (no en mantenimiento) y no tener ya otro operador distinto
 * asignado. Lanza ApiError si algo falla; no hace nada si camionId es falsy.
 * @returns {Promise<object|null>} el camión (para reutilizarlo, ej. la placa en mensajes)
 */
async function validarCamionParaOperador(camionId, operadorIdActual) {
  if (!camionId) return null;

  const camion = await camionesRepo.buscarPorId(camionId);
  if (!camion) throw ApiError.badRequest('El camión seleccionado no existe.', 'CAMION_INVALIDO');
  if (camion.estado !== 'operativo') {
    throw ApiError.badRequest(`No se puede asignar el camión ${camion.placa}: está en mantenimiento.`, 'CAMION_NO_OPERATIVO');
  }
  if (camion.operadorAsignado && Number(camion.operadorAsignado) !== Number(operadorIdActual || 0)) {
    throw ApiError.conflict(`El camión ${camion.placa} ya está asignado a otro operador.`, 'CAMION_OCUPADO');
  }
  return camion;
}

/**
 * GET /api/usuarios/ciudadanos-por-zona/:zonaId (operador/admin) — ciudadanos
 * activos de una zona, usado para identificar al vecino de una recolección.
 */
const ciudadanosPorZona = asyncHandler(async (req, res) => {
  const ciudadanos = await usuariosRepo.listarCiudadanosPorZona(req.params.zonaId);
  res.json({ success: true, data: ciudadanos.map(usuariosRepo.aPublico) });
});

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

  // La zona activa la valida el trigger trg_validar_zona_usuarios al insertar
  // (misma regla de negocio que ya usa el resto del sistema); el camión no
  // tiene un trigger equivalente, así que se valida aquí en la aplicación.
  await validarCamionParaOperador(camionAsignado);

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

  // Sincroniza el lado inverso de la relación (camiones.operador_asignado_id)
  // para que ambas tablas queden consistentes con la misma asignación.
  if (camionAsignado) {
    await camionesRepo.actualizar(camionAsignado, { operadorAsignado: nuevoOperador.id });
  }

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
 * POST /api/usuarios/administradores (admin) — única vía para crear administradores.
 * No existe auto-registro público para este rol, igual que con operadores.
 */
const crearAdministrador = asyncHandler(async (req, res) => {
  const { nombres, apellidos, dni, correo, telefono } = req.body;

  if (await usuariosRepo.existeCorreo(correo)) {
    throw ApiError.conflict('Ya existe una cuenta registrada con este correo.', 'CORREO_DUPLICADO');
  }
  if (await usuariosRepo.existeDni(dni)) {
    throw ApiError.conflict('Ya existe una cuenta registrada con este DNI.', 'DNI_DUPLICADO');
  }

  const passwordTemporal = generarPasswordTemporal();
  const passwordHash = await bcrypt.hash(passwordTemporal, RONDAS_BCRYPT);

  const nuevoAdmin = await usuariosRepo.crear({
    rol: 'admin',
    nombres,
    apellidos,
    dni: dni.trim(),
    correo: correo.trim().toLowerCase(),
    passwordHash,
    telefono,
    estado: 'activo',
    creadoPor: req.user.sub,
    requiere2FA: true,
    debeCambiarPassword: true,
  });

  await enviarCorreo({
    to: nuevoAdmin.correo,
    subject: 'Tu cuenta de administrador — EcoRutas Wanchaq',
    html: plantillaCredencialesAdmin(nuevoAdmin.nombres, nuevoAdmin.correo, passwordTemporal),
  });

  res.status(201).json({
    success: true,
    message: `Se creó la cuenta y se enviaron las credenciales a ${nuevoAdmin.correo}.`,
    data: { usuario: usuariosRepo.aPublico(nuevoAdmin) },
  });
});

/**
 * PUT /api/usuarios/:id (admin)
 */
const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const usuario = await usuariosRepo.buscarPorId(id);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado.');

  // La zona/camión de un operador se administran exclusivamente vía
  // PUT /:id/asignacion (valida estado activo/operativo y conflictos de
  // camión); no se aceptan aquí para no duplicar esa lógica sin validar.
  const camposPermitidos = ['nombres', 'apellidos', 'telefono', 'zona', 'direccion'];
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
 * PUT /api/usuarios/:id/asignacion (admin) — asigna/reasigna la zona de
 * recolección y el camión de un operador. Único punto de entrada para este
 * cambio: valida zona activa (vía trigger de BD) y camión operativo/sin
 * conflicto, y mantiene sincronizado camiones.operador_asignado_id.
 */
const asignarOperador = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { zonaId, camionId } = req.body;

  const usuario = await usuariosRepo.buscarPorId(id);
  if (!usuario) throw ApiError.notFound('Usuario no encontrado.');
  if (usuario.rol !== 'operador') {
    throw ApiError.badRequest('Solo se puede asignar zona y camión a una cuenta de operador.', 'ROL_INVALIDO');
  }

  const camionAnterior = usuario.camionAsignado;
  if (camionId !== undefined) await validarCamionParaOperador(camionId, id);

  const cambios = {};
  if (zonaId !== undefined) cambios.zonaAsignada = zonaId || null;
  if (camionId !== undefined) cambios.camionAsignado = camionId || null;

  const actualizado = await usuariosRepo.actualizar(id, cambios);

  // Sincroniza el lado inverso de la relación: libera el camión anterior (si
  // cambió) y marca el nuevo como asignado a este operador.
  if (camionId !== undefined && camionAnterior && Number(camionAnterior) !== Number(camionId || 0)) {
    await camionesRepo.actualizar(camionAnterior, { operadorAsignado: null });
  }
  if (camionId) {
    await camionesRepo.actualizar(camionId, { operadorAsignado: Number(id) });
  }

  res.json({ success: true, message: 'Zona y camión actualizados correctamente.', data: { usuario: usuariosRepo.aPublico(actualizado) } });
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
  const camposPermitidos = ['telefono', 'zona', 'direccion', 'latitud', 'longitud'];
  const cambios = {};
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  });
  if (cambios.latitud !== undefined) cambios.latitud = cambios.latitud === null || cambios.latitud === '' ? null : Number(cambios.latitud);
  if (cambios.longitud !== undefined) cambios.longitud = cambios.longitud === null || cambios.longitud === '' ? null : Number(cambios.longitud);

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

/**
 * PUT /api/usuarios/perfil/foto (cualquier rol autenticado)
 */
const subirFotoPerfil = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Selecciona una imagen para subir.', 'ARCHIVO_REQUERIDO');

  const fotoPerfil = `/uploads/${req.file.filename}`;
  const actualizado = await usuariosRepo.actualizar(req.user.sub, { fotoPerfil });

  res.json({ success: true, message: 'Foto de perfil actualizada correctamente.', data: { usuario: usuariosRepo.aPublico(actualizado) } });
});

module.exports = {
  listar,
  ciudadanosPorZona,
  crearOperador,
  crearAdministrador,
  actualizar,
  cambiarEstado,
  asignarOperador,
  obtenerPerfil,
  actualizarPerfil,
  cambiarPasswordPerfil,
  subirFotoPerfil,
};
