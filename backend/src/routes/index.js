/**
 * routes/index.js
 * Punto único de montaje de todos los routers de la API bajo el prefijo /api
 * (aplicado en app.js).
 */

const { Router } = require('express');

const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
const zonasRoutes = require('./zonas.routes');
const residuosRoutes = require('./residuos.routes');
const recoleccionesRoutes = require('./recolecciones.routes');
const camionesRoutes = require('./camiones.routes');
const { router: rutasRoutes, gpsRouter } = require('./rutas.routes');
const incidenciasRoutes = require('./incidencias.routes');
const notificacionesRoutes = require('./notificaciones.routes');
const reportesRoutes = require('./reportes.routes');
const auditoriaRoutes = require('./auditoria.routes');
const dniRoutes = require('./dni.routes');

const router = Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'API EcoRutas Wanchaq — Fase 3 en funcionamiento (PostgreSQL).' });
});

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/zonas', zonasRoutes);
router.use('/tipos-residuo', residuosRoutes);
router.use('/recolecciones', recoleccionesRoutes);
router.use('/camiones', camionesRoutes);
router.use('/rutas', rutasRoutes);
router.use('/gps', gpsRouter);
router.use('/incidencias', incidenciasRoutes);
router.use('/notificaciones', notificacionesRoutes);
router.use('/reportes', reportesRoutes);
router.use('/auditoria', auditoriaRoutes);
router.use('/dni', dniRoutes);

module.exports = router;
