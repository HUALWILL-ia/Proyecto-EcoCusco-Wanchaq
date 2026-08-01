/**
 * routes/dni.routes.js
 * Endpoint público (no requiere sesión, para poder usarse también desde el
 * registro público de ciudadano) pero limitado por IP para proteger la cuota
 * gratuita de la API externa de RENIEC.
 */

const { Router } = require('express');

const dni = require('../controllers/dni.controller');
const crearLimitador = require('../middlewares/rateLimiter.middleware');

const router = Router();

const limitador = crearLimitador({ maxPeticiones: 10, ventanaMs: 60 * 1000 });

router.get('/:numero', limitador, dni.consultarDni);

module.exports = router;
