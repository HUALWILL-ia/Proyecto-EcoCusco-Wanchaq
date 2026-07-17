/**
 * middlewares/upload.middleware.js
 * Carga de imágenes adjuntas a reportes de incidencias (multer, almacenamiento
 * en disco local dentro de backend/uploads). En Fase 3 esto podría moverse a
 * un bucket (S3-compatible) sin cambiar la interfaz del controlador.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

const DIR_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(DIR_UPLOADS)) fs.mkdirSync(DIR_UPLOADS, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DIR_UPLOADS),
  filename: (req, file, cb) => {
    const sufijo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${sufijo}${path.extname(file.originalname)}`);
  },
});

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function filtroArchivo(req, file, cb) {
  if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Solo se permiten imágenes (JPEG, PNG, WEBP o GIF).', 'ARCHIVO_INVALIDO'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: filtroArchivo,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;
