/**
 * utils/logger.js
 * Logger mínimo y consistente para toda la API. En Fase 3 puede sustituirse
 * por winston/pino sin tocar los módulos que lo consumen.
 */

function marcaTiempo() {
  return new Date().toISOString();
}

const logger = {
  info(mensaje, extra) {
    // eslint-disable-next-line no-console
    console.log(`[${marcaTiempo()}] [INFO] ${mensaje}`, extra ?? '');
  },
  warn(mensaje, extra) {
    // eslint-disable-next-line no-console
    console.warn(`[${marcaTiempo()}] [WARN] ${mensaje}`, extra ?? '');
  },
  error(mensaje, extra) {
    // eslint-disable-next-line no-console
    console.error(`[${marcaTiempo()}] [ERROR] ${mensaje}`, extra ?? '');
  },
};

module.exports = logger;
