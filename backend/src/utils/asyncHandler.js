/**
 * utils/asyncHandler.js
 * Envuelve controladores async para reenviar cualquier excepción al
 * middleware global de errores (evita try/catch repetido en cada método).
 */

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
