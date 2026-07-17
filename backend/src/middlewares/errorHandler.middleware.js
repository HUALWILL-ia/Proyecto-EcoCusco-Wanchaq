/**
 * middlewares/errorHandler.middleware.js
 * Middleware global de errores. Toda respuesta de error de la API sigue el
 * mismo formato: { success: false, message, code, detalles? }.
 * Debe registrarse al final de la cadena de middlewares en app.js.
 *
 * Fase 3: además de los ApiError "manuales", este middleware traduce los
 * errores que vienen de PostgreSQL (código SQLSTATE de 5 caracteres) —en
 * particular los RAISE EXCEPTION de los triggers de negocio (P0001)— en
 * respuestas { success:false, message } legibles, en vez de dejar pasar el
 * error crudo del driver `pg`.
 */

const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// Códigos SQLSTATE de PostgreSQL que nos interesa traducir a un mensaje claro.
// Referencia: https://www.postgresql.org/docs/current/errcodes-appendix.html
const CODIGOS_POSTGRES = {
  P0001: { status: 400, code: 'REGLA_DE_NEGOCIO' },       // RAISE EXCEPTION de nuestros triggers
  23505: { status: 409, code: 'DUPLICADO' },              // unique_violation
  23503: { status: 409, code: 'REFERENCIA_INVALIDA' },    // foreign_key_violation
  23502: { status: 400, code: 'CAMPO_REQUERIDO' },        // not_null_violation
  23514: { status: 400, code: 'VALOR_INVALIDO' },         // check_violation
  '22P02': { status: 400, code: 'FORMATO_INVALIDO' },     // invalid_text_representation
};

/**
 * Convierte un mensaje técnico de restricción de PostgreSQL (unique/FK/etc.)
 * en un texto entendible cuando el error no vino de un RAISE EXCEPTION propio
 * (esos ya traen mensaje humano definido en el trigger).
 */
function mensajeAmigablePostgres(err, info) {
  if (info.code === 'REGLA_DE_NEGOCIO') return err.message; // ya es el mensaje del RAISE EXCEPTION
  if (info.code === 'DUPLICADO') return `Ya existe un registro con ese valor (${err.constraint || 'restricción única'}).`;
  if (info.code === 'REFERENCIA_INVALIDA') return 'La operación hace referencia a un registro que no existe o no se puede modificar por relaciones existentes.';
  if (info.code === 'CAMPO_REQUERIDO') return `Falta un dato obligatorio (${err.column || 'campo requerido'}).`;
  if (info.code === 'VALOR_INVALIDO') return 'Uno de los valores enviados no cumple una restricción de la base de datos.';
  if (info.code === 'FORMATO_INVALIDO') return 'Uno de los valores enviados tiene un formato inválido.';
  return 'Error de base de datos.';
}

/**
 * Un error viene de `pg` cuando trae un código SQLSTATE (5 caracteres,
 * combinación de letras/números) y no es ya uno de nuestros ApiError.
 */
function esErrorPostgres(err) {
  return typeof err.code === 'string' && /^[A-Z0-9]{5}$/.test(err.code) && CODIGOS_POSTGRES[err.code];
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (esErrorPostgres(err)) {
      const info = CODIGOS_POSTGRES[err.code];
      error = new ApiError(info.status, mensajeAmigablePostgres(err, info), info.code);
    } else {
      // Errores no controlados (bugs, fallos de multer, JSON malformado, etc.)
      const status = error.status || error.statusCode || 500;
      error = new ApiError(status, error.message || 'Error interno del servidor.', error.code || 'ERROR_INTERNO');
    }
  }

  if (error.status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${error.message}`, env.isProduction ? undefined : err.stack);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} — ${error.status} ${error.code}: ${error.message}`);
  }

  const respuesta = {
    success: false,
    message: error.message,
    code: error.code,
  };
  if (error.detalles) respuesta.detalles = error.detalles;
  if (!env.isProduction && error.status >= 500) respuesta.stack = err.stack;

  res.status(error.status).json(respuesta);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    code: 'RUTA_NO_ENCONTRADA',
  });
}

module.exports = { errorHandler, notFoundHandler };
