/**
 * routes/incidencias.routes.js
 */

const { Router } = require('express');
const { body } = require('express-validator');

const incidencias = require('../controllers/incidencias.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const upload = require('../middlewares/upload.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/mis-incidencias', roles(['ciudadano', 'operador']), incidencias.misIncidencias);
router.get('/', roles(['admin']), incidencias.listar);

router.post(
  '/',
  roles(['ciudadano', 'operador']),
  upload.single('foto'),
  [
    body('tipo').notEmpty().withMessage('El tipo de incidencia es obligatorio.'),
    body('descripcion').notEmpty().withMessage('La descripción es obligatoria.'),
    body('zona').notEmpty().withMessage('La zona es obligatoria.'),
    body('direccion').notEmpty().withMessage('La dirección de referencia es obligatoria.'),
  ],
  validate,
  incidencias.crear
);

router.patch('/:id/estado', roles(['admin']), incidencias.actualizarEstado);
router.get('/:id/historial', roles(['admin']), incidencias.obtenerHistorial);

module.exports = router;
