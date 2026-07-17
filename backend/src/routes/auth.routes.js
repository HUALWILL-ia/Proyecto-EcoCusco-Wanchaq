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
    body('password').matches(PASSWORD_REGEX).withMessage('La contraseña debe tener mínimo 8 caracteres, con letras y números.'),
    body('zona').notEmpty().withMessage('Selecciona tu zona de residencia.'),
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

router.post('/logout', auth.logout);

router.get('/me', authMiddleware, auth.me);

module.exports = router;
