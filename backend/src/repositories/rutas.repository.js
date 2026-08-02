/**
 * repositories/rutas.repository.js
 * Fase 3: PostgreSQL real (tabla `rutas`). Los puntos de recolección se
 * guardan como JSONB (mismo arreglo que ya manipulaban los controladores
 * de la Fase 2), evitando normalizar una tabla aparte.
 */

const db = require('../config/db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    zona: row.zona_id,
    camion: row.camion_id,
    operador: row.operador_id,
    turno: row.turno,
    estado: row.estado,
    progreso: row.progreso,
    puntos: row.puntos || [],
    trazado: row.trazado || [],
    creadoEl: row.creado_el,
    updatedAt: row.updated_at,
  };
}

async function leerTodos() {
  const { rows } = await db.query('SELECT * FROM rutas ORDER BY id');
  return rows.map(mapRow);
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM rutas WHERE id = $1', [id]);
  return mapRow(rows[0]);
}

async function buscarPorOperador(operadorId) {
  const { rows } = await db.query('SELECT * FROM rutas WHERE operador_id = $1 ORDER BY id', [operadorId]);
  return rows.map(mapRow);
}

async function crear(ruta) {
  const { rows } = await db.query(
    `INSERT INTO rutas (nombre, zona_id, camion_id, operador_id, turno, estado, progreso, puntos, trazado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      ruta.nombre,
      ruta.zona || null,
      ruta.camion || null,
      ruta.operador || null,
      ruta.turno || '',
      ruta.estado || 'pendiente',
      ruta.progreso ?? 0,
      JSON.stringify(ruta.puntos || []),
      JSON.stringify(ruta.trazado || []),
    ]
  );
  return mapRow(rows[0]);
}

async function actualizar(id, cambios) {
  const asignaciones = [];
  const valores = [];
  const agregar = (columna, valor) => {
    valores.push(valor);
    asignaciones.push(`${columna} = $${valores.length}`);
  };

  if (cambios.nombre !== undefined) agregar('nombre', cambios.nombre);
  if (cambios.zona !== undefined) agregar('zona_id', cambios.zona);
  if (cambios.camion !== undefined) agregar('camion_id', cambios.camion);
  if (cambios.operador !== undefined) agregar('operador_id', cambios.operador);
  if (cambios.turno !== undefined) agregar('turno', cambios.turno);
  if (cambios.estado !== undefined) agregar('estado', cambios.estado);
  if (cambios.progreso !== undefined) agregar('progreso', cambios.progreso);
  if (cambios.puntos !== undefined) agregar('puntos', JSON.stringify(cambios.puntos));
  if (cambios.trazado !== undefined) agregar('trazado', JSON.stringify(cambios.trazado));

  if (asignaciones.length === 0) return buscarPorId(id);

  valores.push(id);
  const { rows } = await db.query(
    `UPDATE rutas SET ${asignaciones.join(', ')} WHERE id = $${valores.length} RETURNING *`,
    valores
  );
  return mapRow(rows[0]);
}

async function eliminar(id) {
  const { rowCount } = await db.query('DELETE FROM rutas WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { leerTodos, buscarPorId, buscarPorOperador, crear, actualizar, eliminar };
