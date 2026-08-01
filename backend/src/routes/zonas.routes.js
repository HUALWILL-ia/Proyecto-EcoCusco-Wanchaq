/**
 * routes/zonas.routes.js
 * Lectura pública (necesaria para el registro público de ciudadanos),
 * escritura exclusiva del admin.
 */

const { Router } = require('express');
const { body } = require('express-validator');

const zonas = require('../controllers/zonas.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

router.get('/', zonas.listar);
router.get('/:id', zonas.obtenerPorId);

router.post(
  '/',
  authMiddleware,
  roles(['admin']),
  [
    body('nombre').notEmpty().withMessage('El nombre de la zona es obligatorio.'),
    body('referencia').notEmpty().withMessage('La referencia es obligatoria.'),
    body('horarioRecoleccion').notEmpty().withMessage('El horario de recolección es obligatorio.'),
  ],
  validate,
  zonas.crear
);

router.put('/:id', authMiddleware, roles(['admin']), zonas.actualizar);
router.patch('/:id', authMiddleware, roles(['admin']), zonas.actualizar);
router.put(
  '/:id/poligono',
  authMiddleware,
  roles(['admin']),
  [body('poligono').isArray({ min: 3 }).withMessage('El polígono debe tener al menos 3 puntos.')],
  validate,
  zonas.actualizarPoligono
);
router.delete('/:id', authMiddleware, roles(['admin']), zonas.eliminar);

module.exports = router;
