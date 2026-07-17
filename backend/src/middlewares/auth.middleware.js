/**
 * middlewares/auth.middleware.js
 * Valida el JWT enviado en el header "Authorization: Bearer <token>" y
 * adjunta el usuario autenticado (payload del token) en req.user.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { conUsuarioActual } = require('../config/db');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [esquema, token] = header.split(' ');

  if (esquema !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Debes iniciar sesión para acceder a este recurso.'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    // Deja disponible el id del usuario autenticado para toda la petición
    // (vía AsyncLocalStorage), de forma que los triggers de auditoría de
    // PostgreSQL sepan quién hizo cada cambio sin tocar los repositorios.
    conUsuarioActual(payload.sub, next);
  } catch (err) {
    return next(ApiError.unauthorized('Sesión inválida o expirada. Inicia sesión nuevamente.', 'TOKEN_INVALIDO'));
  }
}

module.exports = auth;
