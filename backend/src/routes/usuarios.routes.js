/**
 * routes/usuarios.routes.js
 */

const { Router } = require('express');
const { body } = require('express-validator');

const usuarios = require('../controllers/usuarios.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const upload = require('../middlewares/upload.middleware');

const router = Router();

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

router.use(authMiddleware);

// --- Perfil propio (cualquier rol autenticado) — deben ir antes de /:id ---
router.get('/perfil', usuarios.obtenerPerfil);
router.put(
  '/perfil',
  [
    body('telefono').optional({ checkFalsy: true }).matches(/^9\d{8}$/).withMessage('Ingresa un celular peruano válido: 9 dígitos, debe empezar en 9.'),
    body('latitud').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida.'),
    body('longitud').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida.'),
  ],
  validate,
  usuarios.actualizarPerfil
);
router.put(
  '/perfil/password',
  [
    body('passwordActual').notEmpty().withMessage('Ingresa tu contraseña actual.'),
    body('passwordNueva').matches(PASSWORD_REGEX).withMessage('La nueva contraseña debe tener mínimo 8 caracteres, con letras y números.'),
  ],
  validate,
  usuarios.cambiarPasswordPerfil
);
router.put('/perfil/foto', upload.single('foto'), usuarios.subirFotoPerfil);

// --- Gestión administrativa ---
router.get('/ciudadanos-por-zona/:zonaId', roles(['operador', 'admin']), usuarios.ciudadanosPorZona);
router.get('/', roles(['admin']), usuarios.listar);

router.post(
  '/operadores',
  roles(['admin']),
  [
    body('nombres').notEmpty().withMessage('El nombre es obligatorio.'),
    body('apellidos').notEmpty().withMessage('El apellido es obligatorio.'),
    body('dni').matches(/^\d{8}$/).withMessage('El DNI debe tener exactamente 8 dígitos numéricos.'),
    body('correo').isEmail().withMessage('Ingresa un correo electrónico válido.'),
    body('telefono').matches(/^9\d{8}$/).withMessage('Ingresa un celular peruano válido: 9 dígitos, debe empezar en 9.'),
    body('zonaAsignada').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('Zona inválida.'),
    body('camionAsignado').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('Camión inválido.'),
  ],
  validate,
  usuarios.crearOperador
);

router.post(
  '/administradores',
  roles(['admin']),
  [
    body('nombres').notEmpty().withMessage('El nombre es obligatorio.'),
    body('apellidos').notEmpty().withMessage('El apellido es obligatorio.'),
    body('dni').matches(/^\d{8}$/).withMessage('El DNI debe tener exactamente 8 dígitos numéricos.'),
    body('correo').isEmail().withMessage('Ingresa un correo electrónico válido.'),
    body('telefono').matches(/^9\d{8}$/).withMessage('Ingresa un celular peruano válido: 9 dígitos, debe empezar en 9.'),
  ],
  validate,
  usuarios.crearAdministrador
);

router.put(
  '/:id/asignacion',
  roles(['admin']),
  [
    body('zonaId').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('Zona inválida.'),
    body('camionId').optional({ nullable: true, checkFalsy: true }).isInt().withMessage('Camión inválido.'),
  ],
  validate,
  usuarios.asignarOperador
);
router.patch('/:id/estado', roles(['admin']), usuarios.cambiarEstado);
router.put(
  '/:id',
  roles(['admin']),
  [body('telefono').optional({ checkFalsy: true }).matches(/^9\d{8}$/).withMessage('Ingresa un celular peruano válido: 9 dígitos, debe empezar en 9.')],
  validate,
  usuarios.actualizar
);

module.exports = router;
