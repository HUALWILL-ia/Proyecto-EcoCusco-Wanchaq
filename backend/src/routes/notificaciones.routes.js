/**
 * routes/notificaciones.routes.js
 */

const { Router } = require('express');
const notificaciones = require('../controllers/notificaciones.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/preferencias', notificaciones.obtenerPreferencias);
router.put('/preferencias', notificaciones.actualizarPreferencias);
router.patch('/leer-todas', notificaciones.marcarTodasLeidas);
router.get('/', notificaciones.listar);
router.patch('/:id/leida', notificaciones.marcarLeida);

module.exports = router;
