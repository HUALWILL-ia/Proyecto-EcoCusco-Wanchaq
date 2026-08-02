/**
 * server.js
 * Punto de entrada del backend. Levanta Express sobre un servidor HTTP y
 * adjunta Socket.IO (opcional/gratuito) para difundir actualizaciones de
 * GPS en tiempo real a quien esté escuchando el canal de una ruta.
 */

const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { probarConexion } = require('./src/config/db');

const servidorHttp = http.createServer(app);

const io = new Server(servidorHttp, {
  cors: env.isProduction ? { origin: env.FRONTEND_URL } : { origin: '*' },
});

io.on('connection', (socket) => {
  // El cliente puede suscribirse por ruta (admin) o por camión (ciudadano,
  // que no tiene acceso a listar rutas pero sí conoce el camión de su zona).
  // Acepta tanto un id suelto (compatibilidad) como { rutaId, camionId }.
  socket.on('gps:suscribir', (payload) => {
    if (typeof payload === 'object' && payload !== null) {
      if (payload.rutaId) socket.join(`ruta:${payload.rutaId}`);
      if (payload.camionId) socket.join(`camion:${payload.camionId}`);
      // Mapa general del ciudadano: recibe la ubicación de CUALQUIER camión
      // con ruta activa, no solo el de su propia zona (ver
      // ciudadano-seguimiento-gps.js).
      if (payload.todas) socket.join('gps:activos');
    } else if (payload) {
      socket.join(`ruta:${payload}`);
    }
  });
});

// Los controladores acceden a esta instancia vía req.app.get('io') para
// emitir eventos (ej. rutas.controller.js -> actualizarGPS).
app.set('io', io);

servidorHttp.listen(env.PORT, async () => {
  logger.info(`EcoRutas Wanchaq API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  logger.info(`Proveedor de correo configurado: ${env.MAIL_PROVIDER}`);

  try {
    const { ahora, base } = await probarConexion();
    logger.info(`Conexión a PostgreSQL OK — base "${base}" — hora del servidor de BD: ${ahora}`);
  } catch (err) {
    logger.error(
      `No se pudo conectar a PostgreSQL (${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}). ` +
      `Verifica tus credenciales en .env y que la base "${env.DB_NAME}" exista (ver baseDatos_eccoCusco.sql). Detalle: ${err.message}`
    );
  }
});
