/**
 * controllers/dni.controller.js
 * Autocompletado de nombres/apellidos a partir del DNI, usando la API
 * gratuita de RENIEC en apis.net.pe (https://apis.net.pe/api-dni). El token
 * nunca se expone al frontend: solo vive en el backend (env DNI_API_TOKEN).
 * Endpoint público (sin JWT) pero protegido con un límite de peticiones por
 * IP (ver middlewares/rateLimiter.middleware.js) para no agotar la cuota
 * gratuita del servicio ante un mal uso.
 */

const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const URL_RENIEC = 'https://api.apis.net.pe/v2/reniec/dni';

/**
 * GET /api/dni/:numero
 */
const consultarDni = asyncHandler(async (req, res) => {
  const { numero } = req.params;

  if (!/^\d{8}$/.test(numero)) {
    throw ApiError.badRequest('El DNI debe tener exactamente 8 dígitos numéricos.', 'DNI_INVALIDO');
  }

  if (!env.DNI_API_TOKEN) {
    throw ApiError.badRequest(
      'La consulta automática de DNI no está configurada en el servidor. Completa los datos manualmente.',
      'DNI_API_NO_CONFIGURADA'
    );
  }

  let respuesta;
  try {
    respuesta = await fetch(`${URL_RENIEC}?numero=${numero}`, {
      headers: { Authorization: `Bearer ${env.DNI_API_TOKEN}` },
    });
  } catch (err) {
    throw ApiError.badRequest(
      'No se pudo conectar con el servicio de consulta de DNI. Completa los datos manualmente.',
      'DNI_SERVICIO_CAIDO'
    );
  }

  if (respuesta.status === 404) {
    throw ApiError.notFound('No se encontró información para ese DNI. Completa los datos manualmente.', 'DNI_NO_ENCONTRADO');
  }
  if (respuesta.status === 429) {
    throw ApiError.badRequest(
      'Se alcanzó el límite de consultas gratuitas del servicio de DNI por hoy. Completa los datos manualmente.',
      'DNI_LIMITE_ALCANZADO'
    );
  }
  if (!respuesta.ok) {
    throw ApiError.badRequest(
      'El servicio de consulta de DNI no está disponible en este momento. Completa los datos manualmente.',
      'DNI_SERVICIO_CAIDO'
    );
  }

  const datos = await respuesta.json();
  const nombres = datos.nombres || '';
  const apellidos = datos.apellidos || [datos.apellidoPaterno, datos.apellidoMaterno].filter(Boolean).join(' ');

  if (!nombres && !apellidos) {
    throw ApiError.notFound('No se encontró información para ese DNI. Completa los datos manualmente.', 'DNI_NO_ENCONTRADO');
  }

  res.json({ success: true, data: { nombres, apellidos } });
});

module.exports = { consultarDni };
