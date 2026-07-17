/**
 * routes/auditoria.routes.js
 */

const { Router } = require('express');
const auditoria = require('../controllers/auditoria.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

const router = Router();

router.use(authMiddleware);
router.get('/', roles(['admin']), auditoria.listar);

module.exports = router;
