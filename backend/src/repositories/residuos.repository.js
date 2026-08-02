/**
 * repositories/residuos.repository.js
 * Fase 3: PostgreSQL real (tabla `tipos_residuo`).
 */

const db = require('../config/db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    color: row.color,
    icono: row.icono,
    diasRecomendados: row.dias_recomendados || [],
    contenedor: row.contenedor,
  };
}

async function leerTodos() {
  const { rows } = await db.query('SELECT * FROM tipos_residuo ORDER BY id');
  return rows.map(mapRow);
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM tipos_residuo WHERE id = $1', [id]);
  return mapRow(rows[0]);
}

async function crear(tipo) {
  const { rows } = await db.query(
    `INSERT INTO tipos_residuo (nombre, descripcion, color, icono, dias_recomendados, contenedor)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      tipo.nombre,
      tipo.descripcion,
      tipo.color || '#2c9a54',
      tipo.icono || 'trash', // nombre de ícono Phosphor (ph-trash), no un emoji
      tipo.diasRecomendados || [],
      tipo.contenedor || 'Por definir',
    ]
  );
  return mapRow(rows[0]);
}

const COLUMNAS_ACTUALIZABLES = {
  nombre: 'nombre',
  descripcion: 'descripcion',
  color: 'color',
  icono: 'icono',
  diasRecomendados: 'dias_recomendados',
  contenedor: 'contenedor',
};

async function actualizar(id, cambios) {
  const asignaciones = [];
  const valores = [];
  Object.entries(cambios).forEach(([campo, valor]) => {
    const columna = COLUMNAS_ACTUALIZABLES[campo];
    if (!columna) return;
    valores.push(valor);
    asignaciones.push(`${columna} = $${valores.length}`);
  });

  if (asignaciones.length === 0) return buscarPorId(id);

  valores.push(id);
  const { rows } = await db.query(
    `UPDATE tipos_residuo SET ${asignaciones.join(', ')} WHERE id = $${valores.length} RETURNING *`,
    valores
  );
  return mapRow(rows[0]);
}

async function eliminar(id) {
  const { rowCount } = await db.query('DELETE FROM tipos_residuo WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { leerTodos, buscarPorId, crear, actualizar, eliminar };
