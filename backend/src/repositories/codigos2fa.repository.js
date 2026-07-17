/**
 * repositories/codigos2fa.repository.js
 * Fase 3: los códigos de verificación en dos pasos ahora se persisten en
 * PostgreSQL (tabla `codigos_verificacion_2fa`) en vez de un Map en memoria,
 * para sobrevivir reinicios del servidor y quedar auditables.
 */

const db = require('../config/db');

const DURACION_MINUTOS = 5;

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    codigo: row.codigo,
    expiraEl: row.expira_el,
    usado: row.usado,
    creadoEl: row.creado_el,
  };
}

/**
 * Genera y guarda un nuevo código para el usuario (los códigos anteriores
 * no usados quedan simplemente expirados/ignorados por la consulta de
 * obtenerVigente, que siempre toma el más reciente).
 */
async function guardar(usuarioId, codigo) {
  const { rows } = await db.query(
    `INSERT INTO codigos_verificacion_2fa (usuario_id, codigo, expira_el)
     VALUES ($1, $2, NOW() + INTERVAL '${DURACION_MINUTOS} minutes')
     RETURNING *`,
    [usuarioId, codigo]
  );
  return mapRow(rows[0]);
}

async function obtenerVigente(usuarioId) {
  const { rows } = await db.query(
    `SELECT * FROM codigos_verificacion_2fa
     WHERE usuario_id = $1 AND usado = FALSE AND expira_el > NOW()
     ORDER BY creado_el DESC LIMIT 1`,
    [usuarioId]
  );
  return mapRow(rows[0]);
}

async function marcarUsado(id) {
  await db.query('UPDATE codigos_verificacion_2fa SET usado = TRUE WHERE id = $1', [id]);
}

module.exports = { guardar, obtenerVigente, marcarUsado, DURACION_MINUTOS };
