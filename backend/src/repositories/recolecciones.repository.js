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
    usuario: row.usuario_id,
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
    `INSERT INTO recolecciones (operador_id, usuario_id, ruta_id, ruta_nombre, tipo_residuo, kg, observaciones, fecha)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
     RETURNING *`,
    [
      registro.operador,
      registro.usuario || null,
      registro.rutaId,
      registro.rutaNombre,
      registro.tipoResiduo,
      registro.kg,
      registro.observaciones || null,
      registro.fecha || null,
    ]
  );
  return mapRow(rows[0]);
}

async function buscarPorOperador(operadorId) {
  const { rows } = await db.query('SELECT * FROM recolecciones WHERE operador_id = $1 ORDER BY fecha DESC', [operadorId]);
  return rows.map(mapRow);
}

/**
 * Historial de recolecciones de la zona de un ciudadano. `recolecciones` no
 * tiene zona propia: se llega a ella a través de la ruta que la generó
 * (recolecciones.ruta_id -> rutas.zona_id -> zonas.nombre).
 */
async function buscarPorZonaNombre(zonaNombre) {
  const { rows } = await db.query(
    `SELECT r.*, z.nombre AS zona_nombre
     FROM recolecciones r
     JOIN rutas ru ON ru.id = r.ruta_id
     JOIN zonas z ON z.id = ru.zona_id
     WHERE z.nombre = $1
     ORDER BY r.fecha DESC`,
    [zonaNombre]
  );
  return rows.map((row) => ({ ...mapRow(row), zona: row.zona_nombre, estado: 'completada' }));
}

module.exports = { leerTodos, crear, buscarPorOperador, buscarPorZonaNombre };
