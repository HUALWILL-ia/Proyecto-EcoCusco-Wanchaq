/**
 * repositories/zonas.repository.js
 * Fase 3: PostgreSQL real (tabla `zonas`) vía config/db.js.
 * Mantiene exactamente los mismos nombres de función y la misma forma de
 * los objetos devueltos (camelCase) que la versión de Fase 2 basada en JSON.
 */

const db = require('../config/db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    referencia: row.referencia,
    horarioRecoleccion: row.horario_recoleccion,
    tipoResiduoPrincipal: row.tipo_residuo_principal,
    contenedores: row.contenedores,
    poblacionEstimada: row.poblacion_estimada,
    estado: row.estado,
  };
}

async function leerTodos() {
  const { rows } = await db.query('SELECT * FROM zonas ORDER BY id');
  return rows.map(mapRow);
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM zonas WHERE id = $1', [id]);
  return mapRow(rows[0]);
}

async function buscarPorNombre(nombre) {
  const { rows } = await db.query('SELECT * FROM zonas WHERE nombre = $1', [nombre]);
  return mapRow(rows[0]);
}

async function crear(zona) {
  const codigo = zona.codigo || `ZW-${Date.now().toString().slice(-6)}`;
  const { rows } = await db.query(
    `INSERT INTO zonas (codigo, nombre, descripcion, referencia, horario_recoleccion, tipo_residuo_principal, contenedores, poblacion_estimada)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      codigo,
      zona.nombre,
      zona.descripcion || '',
      zona.referencia,
      zona.horarioRecoleccion,
      zona.tipoResiduoPrincipal || 'Mixto',
      Number(zona.contenedores) || 0,
      Number(zona.poblacionEstimada) || 0,
    ]
  );
  return mapRow(rows[0]);
}

const COLUMNAS_ACTUALIZABLES = {
  nombre: 'nombre',
  descripcion: 'descripcion',
  referencia: 'referencia',
  horarioRecoleccion: 'horario_recoleccion',
  tipoResiduoPrincipal: 'tipo_residuo_principal',
  contenedores: 'contenedores',
  poblacionEstimada: 'poblacion_estimada',
  estado: 'estado',
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
    `UPDATE zonas SET ${asignaciones.join(', ')} WHERE id = $${valores.length} RETURNING *`,
    valores
  );
  return mapRow(rows[0]);
}

async function eliminar(id) {
  const { rowCount } = await db.query('DELETE FROM zonas WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { leerTodos, buscarPorId, buscarPorNombre, crear, actualizar, eliminar };
