/**
 * repositories/recolecciones.repository.js
 * Fase 3: PostgreSQL real (tabla `recolecciones`).
 */

const db = require('../config/db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    operador: row.operador_id,
    rutaId: row.ruta_id,
    rutaNombre: row.ruta_nombre,
    tipoResiduo: row.tipo_residuo,
    kg: row.kg !== null ? Number(row.kg) : null,
    observaciones: row.observaciones,
    fecha: row.fecha,
  };
}

async function leerTodos() {
  const { rows } = await db.query('SELECT * FROM recolecciones ORDER BY fecha DESC');
  return rows.map(mapRow);
}

async function crear(registro) {
  const { rows } = await db.query(
    `INSERT INTO recolecciones (operador_id, ruta_id, ruta_nombre, tipo_residuo, kg, observaciones)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [registro.operador, registro.rutaId, registro.rutaNombre, registro.tipoResiduo, registro.kg, registro.observaciones || null]
  );
  return mapRow(rows[0]);
}

async function buscarPorOperador(operadorId) {
  const { rows } = await db.query('SELECT * FROM recolecciones WHERE operador_id = $1 ORDER BY fecha DESC', [operadorId]);
  return rows.map(mapRow);
}

module.exports = { leerTodos, crear, buscarPorOperador };
