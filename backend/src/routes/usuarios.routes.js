/**
 * routes/usuarios.routes.js
 */

const { Router } = require('express');
const { body } = require('express-validator');

const usuarios = require('../controllers/usuarios.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

router.use(authMiddleware);

// --- Perfil propio (cualquier rol autenticado) — deben ir antes de /:id ---
router.get('/perfil', usuarios.obtenerPerfil);
router.put('/perfil', usuarios.actualizarPerfil);
router.put(
  '/perfil/password',
  [
    body('passwordActual').notEmpty().withMessage('Ingresa tu contraseña actual.'),
    body('passwordNueva').matches(PASSWORD_REGEX).withMessage('La nueva contraseña debe tener mínimo 8 caracteres, con letras y números.'),
  ],
  validate,
  usuarios.cambiarPasswordPerfil
);

// --- Gestión administrativa ---
router.get('/', roles(['admin']), usuarios.listar);

router.post(
  '/operadores',
  roles(['admin']),
  [
    body('nombres').notEmpty().withMessage('El nombre es obligatorio.'),
    body('apellidos').notEmpty().withMessage('El apellido es obligatorio.'),
    body('dni').matches(/^\d{8}$/).withMessage('El DNI debe tener exactamente 8 dígitos numéricos.'),
    body('correo').isEmail().withMessage('Ingresa un correo electrónico válido.'),
  ],
  validate,
  usuarios.crearOperador
);

router.put('/:id/zona', roles(['admin']), usuarios.asignarZona);
router.patch('/:id/estado', roles(['admin']), usuarios.cambiarEstado);
router.put('/:id', roles(['admin']), usuarios.actualizar);

module.exports = router;
