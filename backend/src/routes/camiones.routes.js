/**
 * routes/camiones.routes.js
 */

const { Router } = require('express');
const { body } = require('express-validator');

const camiones = require('../controllers/camiones.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/mi-camion', roles(['operador']), camiones.obtenerMiCamion);
router.get('/disponibles', roles(['admin']), camiones.obtenerDisponibles);
router.get('/', camiones.listar);
router.get('/:id', camiones.obtenerPorId);

router.post(
  '/',
  roles(['admin']),
  [
    body('placa').notEmpty().withMessage('La placa es obligatoria.'),
    body('modelo').notEmpty().withMessage('El modelo es obligatorio.'),
  ],
  validate,
  camiones.crear
);

router.put('/:id', roles(['admin']), camiones.actualizar);
router.delete('/:id', roles(['admin']), camiones.eliminar);

module.exports = router;
