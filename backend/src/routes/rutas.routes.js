/**
 * routes/rutas.routes.js
 * Exporta dos routers: uno para /api/rutas y otro para /api/gps
 * (el seguimiento GPS vive conceptualmente junto a las rutas/camiones,
 * pero se expone bajo su propio prefijo tal como lo consume el frontend).
 */

const { Router } = require('express');
const { body } = require('express-validator');

const rutas = require('../controllers/rutas.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');

const router = Router();
const gpsRouter = Router();

router.use(authMiddleware);

router.get('/horarios', rutas.obtenerHorarios);
router.get('/operador', roles(['operador']), rutas.obtenerPorOperador);
router.get('/', roles(['admin']), rutas.listar);
router.get('/:id', rutas.obtenerPorId);
// Sin roles() -- cualquier rol autenticado (ciudadano incluido) puede
// consultar el trazado/puntos de una ruta, igual que GET /:id de arriba.
router.get('/:id/trazado', rutas.obtenerTrazado);
router.get('/:id/puntos-recojo', rutas.obtenerPuntosRecojo);

router.post(
  '/',
  roles(['admin']),
  [body('nombre').notEmpty().withMessage('El nombre de la ruta es obligatorio.')],
  validate,
  rutas.crear
);

router.put('/:id', roles(['admin']), rutas.actualizar);
router.delete('/:id', roles(['admin']), rutas.eliminar);

router.post('/:id/iniciar', roles(['operador']), rutas.iniciar);
router.post('/:id/finalizar', roles(['operador']), rutas.finalizar);
router.patch('/:id/puntos/:orden', roles(['operador']), rutas.actualizarPunto);

gpsRouter.use(authMiddleware);
gpsRouter.post(
  '/actualizar',
  roles(['operador']),
  [
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida.'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida.'),
  ],
  validate,
  rutas.actualizarGPS
);
gpsRouter.get('/camion/:camionId', rutas.obtenerGPSPorCamion);
gpsRouter.get('/activos', rutas.obtenerGPSActivos);
gpsRouter.get('/:rutaId', roles(['admin']), rutas.obtenerGPSPorRuta);

module.exports = { router, gpsRouter };
