/**
 * middlewares/rateLimiter.middleware.js
 * Limitador simple en memoria (sin dependencias externas), por IP, para
 * endpoints públicos que consumen una API externa de cuota limitada (ej. la
 * consulta de DNI en apis.net.pe). No pretende ser un rate-limiter distribuido:
 * alcanza para proteger una demo/proyecto académico de un solo servidor.
 */

function crearLimitador({ maxPeticiones, ventanaMs }) {
  const registro = new Map(); // ip -> { conteo, expiraEn }

  return function limitador(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'desconocido';
    const ahora = Date.now();
    const entrada = registro.get(ip);

    if (!entrada || ahora > entrada.expiraEn) {
      registro.set(ip, { conteo: 1, expiraEn: ahora + ventanaMs });
      return next();
    }

    if (entrada.conteo >= maxPeticiones) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas consultas en poco tiempo. Espera un momento e inténtalo de nuevo, o completa los datos manualmente.',
        code: 'LIMITE_PETICIONES',
      });
    }

    entrada.conteo += 1;
    next();
  };
}

module.exports = crearLimitador;
