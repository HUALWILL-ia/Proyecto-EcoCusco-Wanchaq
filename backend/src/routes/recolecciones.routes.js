/**
 * routes/recolecciones.routes.js
 */

const { Router } = require('express');
const { body } = require('express-validator');

const recolecciones = require('../controllers/recolecciones.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/mis-recolecciones', roles(['operador']), recolecciones.misRecolecciones);
router.get('/', roles(['admin']), recolecciones.listar);

router.post(
  '/',
  roles(['operador']),
  [
    body('rutaId').notEmpty().withMessage('La ruta es obligatoria.'),
    body('tipoResiduo').notEmpty().withMessage('El tipo de residuo es obligatorio.'),
    body('kg').isFloat({ gt: 0 }).withMessage('Ingresa una cantidad válida en kilogramos.'),
  ],
  validate,
  recolecciones.crear
);

module.exports = router;
