/**
 * routes/residuos.routes.js
 */

const { Router } = require('express');
const { body } = require('express-validator');

const residuos = require('../controllers/residuos.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

router.get('/', residuos.listar);

router.post(
  '/',
  authMiddleware,
  roles(['admin']),
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio.'),
    body('descripcion').notEmpty().withMessage('La descripción es obligatoria.'),
  ],
  validate,
  residuos.crear
);

router.put('/:id', authMiddleware, roles(['admin']), residuos.actualizar);
router.patch('/:id', authMiddleware, roles(['admin']), residuos.actualizar);
router.delete('/:id', authMiddleware, roles(['admin']), residuos.eliminar);

module.exports = router;
