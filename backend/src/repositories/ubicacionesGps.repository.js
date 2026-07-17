/**
 * repositories/ubicacionesGps.repository.js
 * Fase 3 — GPS real: última posición conocida por ruta (tabla `ubicaciones_gps`).
 * Una fila por ruta_id (UNIQUE), actualizada con UPSERT cada vez que el
 * operador transmite su ubicación real desde el celular.
 */

const db = require('../config/db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    rutaId: row.ruta_id,
    camionId: row.camion_id,
    operadorId: row.operador_id,
    lat: Number(row.lat),
    lng: Number(row.lng),
    velocidad: row.velocidad !== null ? Number(row.velocidad) : null,
    fecha: row.fecha,
    placa: row.placa || null,
  };
}

/**
 * Guarda o actualiza (UPSERT) la posición GPS más reciente de una ruta.
 */
async function upsert({ rutaId, camionId, operadorId, lat, lng, velocidad }) {
  const { rows } = await db.query(
    `INSERT INTO ubicaciones_gps (ruta_id, camion_id, operador_id, lat, lng, velocidad, fecha)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (ruta_id) DO UPDATE SET
       camion_id = EXCLUDED.camion_id,
       operador_id = EXCLUDED.operador_id,
       lat = EXCLUDED.lat,
       lng = EXCLUDED.lng,
       velocidad = EXCLUDED.velocidad,
       fecha = NOW()
     RETURNING *`,
    [rutaId, camionId, operadorId, lat, lng, velocidad]
  );
  return mapRow(rows[0]);
}

/**
 * Última ubicación conocida de una ruta (con la placa del camión, útil para el mapa).
 */
async function obtenerPorRuta(rutaId) {
  const { rows } = await db.query(
    `SELECT g.*, c.placa
     FROM ubicaciones_gps g
     LEFT JOIN camiones c ON c.id = g.camion_id
     WHERE g.ruta_id = $1`,
    [rutaId]
  );
  return mapRow(rows[0]);
}

/**
 * Última ubicación conocida por camión (la usan ciudadanos, que no tienen
 * acceso a listar rutas, pero sí conocen el camión asignado a su zona).
 */
async function obtenerPorCamion(camionId) {
  const { rows } = await db.query(
    `SELECT g.*, c.placa
     FROM ubicaciones_gps g
     LEFT JOIN camiones c ON c.id = g.camion_id
     WHERE g.camion_id = $1
     ORDER BY g.fecha DESC
     LIMIT 1`,
    [camionId]
  );
  return mapRow(rows[0]);
}

module.exports = { upsert, obtenerPorRuta, obtenerPorCamion };
