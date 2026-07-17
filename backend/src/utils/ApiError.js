/**
 * utils/ApiError.js
 * Error tipado para que los controladores comuniquen código HTTP + código
 * de negocio al middleware global de errores, con un formato consistente:
 * { success: false, message, code }.
 */

class ApiError extends Error {
  constructor(status, message, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message, code = 'BAD_REQUEST') {
    return new ApiError(400, message, code);
  }

  static unauthorized(message = 'No autenticado.', code = 'NO_AUTENTICADO') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'No tienes permisos para esta acción.', code = 'PROHIBIDO') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Recurso no encontrado.', code = 'NO_ENCONTRADO') {
    return new ApiError(404, message, code);
  }

  static conflict(message, code = 'CONFLICTO') {
    return new ApiError(409, message, code);
  }
}

module.exports = ApiError;
