/**
 * src/app.js
 * Configuración de la aplicación Express: middlewares globales, CORS,
 * archivos estáticos (imágenes de incidencias) y montaje de rutas.
 */

const path = require('path');
const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler.middleware');
const logger = require('./utils/logger');

const app = express();

// Detrás del proxy de Render (u otro PaaS) req.ip devolvería siempre la IP
// interna del proxy si no se declara como confiable. Esto es necesario para
// que el rate limiter y los logs vean la IP real del cliente.
if (env.isProduction) {
  app.set('trust proxy', 1);
}

// --- CORS ---------------------------------------------------------------
// En producción solo se permite el origen configurado en FRONTEND_URL.
// En desarrollo se acepta cualquier origen para facilitar abrir el frontend
// como archivo local o con distintos puertos de "live server".
const corsOptions = env.isProduction
  ? { origin: env.FRONTEND_URL }
  : { origin: true };
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (!env.isProduction) {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// Imágenes subidas para incidencias (Fase 2: disco local; Fase 3: bucket externo)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Este servidor es solo la API (no sirve el frontend). Una visita a "/" es
// casi siempre alguien probando la URL en el navegador, así que respondemos
// con una guía en vez de un 404 confuso.
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API EcoRutas Wanchaq (Fase 2). Este servidor no sirve el frontend.',
    comoUsar: 'Abre frontend/public/index.html con un servidor estático (ej. Live Server) — no esta URL.',
    pruebaRapida: 'GET /api',
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
