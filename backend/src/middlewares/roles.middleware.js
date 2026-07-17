/**
 * middlewares/roles.middleware.js
 * Restringe el acceso a una ruta según el rol del usuario autenticado.
 * Debe usarse siempre después de auth.middleware.
 *
 * Uso: router.get('/admin-only', auth, roles(['admin']), controlador)
 */

const ApiError = require('../utils/ApiError');

function roles(rolesPermitidos = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      return next(ApiError.forbidden(
        `Este recurso requiere uno de estos roles: ${rolesPermitidos.join(', ')}.`
      ));
    }
    next();
  };
}

module.exports = roles;
