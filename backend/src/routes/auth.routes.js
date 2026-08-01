/**
 * routes/auth.routes.js
 */

const { Router } = require('express');
const { body } = require('express-validator');

const auth = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

router.post(
  '/registro-ciudadano',
  [
    body('correo').isEmail().withMessage('Ingresa un correo electrónico válido.'),
    body('dni').matches(/^\d{8}$/).withMessage('El DNI debe tener exactamente 8 dígitos numéricos.'),
    body('nombres').trim().notEmpty().withMessage('Los nombres son obligatorios.'),
    body('apellidos').trim().notEmpty().withMessage('Los apellidos son obligatorios.'),
    body('telefono').matches(/^9\d{8}$/).withMessage('Ingresa un celular peruano válido: 9 dígitos, debe empezar en 9.'),
    body('password').matches(PASSWORD_REGEX).withMessage('La contraseña debe tener mínimo 8 caracteres, con letras y números.'),
    body('zona').notEmpty().withMessage('Selecciona tu zona de residencia.'),
    body('direccion').trim().notEmpty().withMessage('Ingresa tu dirección (calle/avenida y número).'),
    body('latitud').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida.'),
    body('longitud').optional({ nullable: true, checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida.'),
  ],
  validate,
  auth.registroCiudadano
);

router.post(
  '/login',
  [
    body('identificador').notEmpty().withMessage('Ingresa tu correo o DNI.'),
    body('password').notEmpty().withMessage('Ingresa tu contraseña.'),
  ],
  validate,
  auth.login
);

router.post(
  '/verificar-2fa',
  [
    body('correo').isEmail().withMessage('Correo inválido.'),
    body('codigo').matches(/^\d{6}$/).withMessage('El código debe tener exactamente 6 dígitos.'),
  ],
  validate,
  auth.verificar2FA
);

router.post(
  '/reenviar-2fa',
  [body('correo').isEmail().withMessage('Correo inválido.')],
  validate,
  auth.reenviar2FA
);

router.post(
  '/olvide-password',
  [body('correo').isEmail().withMessage('Ingresa un correo electrónico válido.')],
  validate,
  auth.olvidePassword
);

router.post('/logout', auth.logout);

router.get('/me', authMiddleware, auth.me);

module.exports = router;
