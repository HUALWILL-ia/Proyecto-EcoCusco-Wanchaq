/**
 * repositories/notificaciones.repository.js
 * Fase 3: PostgreSQL real (tablas `notificaciones` y `preferencias_notificacion`).
 */

const db = require('../config/db');

const PREFERENCIAS_POR_DEFECTO = {
  emailRecoleccion: true,
  emailIncidencias: true,
  pushNotificaciones: true,
};

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    paraRol: row.para_rol,
    paraUsuario: row.para_usuario,
    titulo: row.titulo,
    mensaje: row.mensaje,
    tipo: row.tipo,
    leida: row.leida,
    fecha: row.fecha,
  };
}

function mapPreferencias(row) {
  if (!row) return { ...PREFERENCIAS_POR_DEFECTO };
  return {
    emailRecoleccion: row.email_recoleccion,
    emailIncidencias: row.email_incidencias,
    pushNotificaciones: row.push_notificaciones,
  };
}

async function leerTodos() {
  const { rows } = await db.query('SELECT * FROM notificaciones ORDER BY fecha DESC');
  return rows.map(mapRow);
}

async function buscarPorUsuario(usuarioId) {
  const { rows } = await db.query('SELECT * FROM notificaciones WHERE para_usuario = $1 ORDER BY fecha DESC', [usuarioId]);
  return rows.map(mapRow);
}

async function crear(notificacion) {
  const { rows } = await db.query(
    `INSERT INTO notificaciones (para_rol, para_usuario, titulo, mensaje, tipo, leida, fecha)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
     RETURNING *`,
    [
      notificacion.paraRol,
      notificacion.paraUsuario,
      notificacion.titulo,
      notificacion.mensaje,
      notificacion.tipo || 'info',
      notificacion.leida ?? false,
      notificacion.fecha || null,
    ]
  );
  return mapRow(rows[0]);
}

async function marcarLeida(id, usuarioId) {
  const { rows } = await db.query(
    `UPDATE notificaciones SET leida = TRUE WHERE id = $1 AND para_usuario = $2 RETURNING *`,
    [id, usuarioId]
  );
  return mapRow(rows[0]);
}

async function marcarTodasLeidas(usuarioId) {
  const { rowCount } = await db.query(
    `UPDATE notificaciones SET leida = TRUE WHERE para_usuario = $1 AND leida = FALSE`,
    [usuarioId]
  );
  return rowCount;
}

async function obtenerPreferencias(usuarioId) {
  const { rows } = await db.query('SELECT * FROM preferencias_notificacion WHERE usuario_id = $1', [usuarioId]);
  return mapPreferencias(rows[0]);
}

async function guardarPreferencias(usuarioId, preferencias) {
  const actuales = { ...PREFERENCIAS_POR_DEFECTO, ...(await obtenerPreferencias(usuarioId)), ...preferencias };
  const { rows } = await db.query(
    `INSERT INTO preferencias_notificacion (usuario_id, email_recoleccion, email_incidencias, push_notificaciones)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario_id) DO UPDATE SET
       email_recoleccion = EXCLUDED.email_recoleccion,
       email_incidencias = EXCLUDED.email_incidencias,
       push_notificaciones = EXCLUDED.push_notificaciones
     RETURNING *`,
    [usuarioId, actuales.emailRecoleccion, actuales.emailIncidencias, actuales.pushNotificaciones]
  );
  return mapPreferencias(rows[0]);
}

module.exports = {
  leerTodos,
  buscarPorUsuario,
  crear,
  marcarLeida,
  marcarTodasLeidas,
  obtenerPreferencias,
  guardarPreferencias,
};
