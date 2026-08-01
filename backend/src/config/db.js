/**
 * config/db.js
 * Pool de conexiones a PostgreSQL (Fase 3) + helper de contexto de usuario
 * para que los triggers de auditoría (registrar_auditoria(),
 * registrar_historial_incidencia()) sepan QUIÉN hizo cada cambio, sin tener
 * que agregar un parámetro nuevo a ninguna función de los repositorios.
 *
 * Cómo funciona el "quién": auth.middleware.js envuelve el resto de la
 * petición en conUsuarioActual(idDelUsuarioAutenticado, next). Esa asociación
 * viaja de forma transparente (vía AsyncLocalStorage, sin variables globales
 * ni parámetros extra) hasta esta capa, que antes de cada query ejecuta
 *   SELECT set_config('app.current_user_id', '<id>', true)
 * dentro de la MISMA transacción que la consulta real, para que los triggers
 * de PostgreSQL puedan leerlo con current_setting('app.current_user_id', true).
 */

const { Pool } = require('pg');
const { AsyncLocalStorage } = require('node:async_hooks');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  // Los proveedores de PostgreSQL gestionado (Neon, Render, Railway...)
  // exigen SSL. rejectUnauthorized:false evita fallos por certificados
  // intermedios que no están en la cadena de confianza por defecto de Node.
  ssl: env.isProduction ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  logger.error('[db] Error inesperado en una conexión inactiva del pool:', err.message);
});

const almacenContexto = new AsyncLocalStorage();

/**
 * Ejecuta fn() con el id de usuario autenticado disponible para toda la
 * cadena async posterior (usada por auth.middleware.js).
 */
function conUsuarioActual(usuarioId, fn) {
  return almacenContexto.run({ usuarioId }, fn);
}

function usuarioActualId() {
  return almacenContexto.getStore()?.usuarioId ?? null;
}

/**
 * Ejecuta una consulta parametrizada dentro de una transacción corta que
 * primero fija app.current_user_id (para los triggers de auditoría) y luego
 * corre la consulta real. Es el único punto de acceso a la base de datos que
 * deben usar los repositorios.
 */
async function query(texto, params = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const uid = usuarioActualId();
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [uid != null ? String(uid) : '']);
    const resultado = await client.query(texto, params);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Prueba de conexión al arrancar el servidor (server.js la llama una vez).
 */
async function probarConexion() {
  const resultado = await pool.query('SELECT NOW() AS ahora, current_database() AS base');
  return resultado.rows[0];
}

module.exports = { pool, query, conUsuarioActual, usuarioActualId, probarConexion };
