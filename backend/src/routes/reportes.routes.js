/**
 * routes/reportes.routes.js
 */

const { Router } = require('express');
const reportes = require('../controllers/reportes.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/kpis-admin', roles(['admin']), reportes.kpisAdmin);
router.get('/kpis-ciudadano', roles(['ciudadano']), reportes.kpisCiudadano);
router.get('/kpis-operador', roles(['operador']), reportes.kpisOperador);
router.get('/exportar/pdf', roles(['admin']), reportes.exportarPDF);
router.get('/exportar/excel', roles(['admin']), reportes.exportarExcel);

module.exports = router;
