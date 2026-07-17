/**
 * middlewares/validate.middleware.js
 * Ejecuta los resultados de las cadenas de validación de express-validator
 * declaradas en las rutas y corta la petición con un 400 consistente si
 * alguna falla.
 *
 * Uso: router.post('/x', [body('correo').isEmail(), ...], validate, controlador)
 */

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, res, next) {
  const resultado = validationResult(req);
  if (resultado.isEmpty()) return next();

  const primerError = resultado.array()[0];
  const error = ApiError.badRequest(primerError.msg, 'VALIDACION');
  error.detalles = resultado.array().map((e) => ({ campo: e.path, mensaje: e.msg }));
  next(error);
}

module.exports = validate;
