/**
 * repositories/camiones.repository.js
 * Fase 3: PostgreSQL real (tabla `camiones`).
 */

const db = require('../config/db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    placa: row.placa,
    modelo: row.modelo,
    capacidadKg: row.capacidad_kg,
    estado: row.estado,
    operadorAsignado: row.operador_asignado_id,
    zonaAsignada: row.zona_asignada_id,
    ultimoMantenimiento: row.ultimo_mantenimiento,
    nivelCombustible: row.nivel_combustible,
    ubicacionActual: {
      lat: row.ubicacion_lat !== null ? Number(row.ubicacion_lat) : null,
      lng: row.ubicacion_lng !== null ? Number(row.ubicacion_lng) : null,
      referencia: row.ubicacion_referencia,
    },
    updatedAt: row.updated_at,
  };
}

async function leerTodos() {
  const { rows } = await db.query('SELECT * FROM camiones ORDER BY id');
  return rows.map(mapRow);
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM camiones WHERE id = $1', [id]);
  return mapRow(rows[0]);
}

async function buscarPorOperador(operadorId) {
  const { rows } = await db.query('SELECT * FROM camiones WHERE operador_asignado_id = $1', [operadorId]);
  return mapRow(rows[0]);
}

/**
 * Camiones operativos y sin conflicto de asignación: libres (sin operador) o
 * ya asignados al propio operador que se está editando (para que su camión
 * actual siga apareciendo como opción al reasignarlo). Usado para poblar el
 * selector "Camión asignado" al crear/reasignar un operador.
 */
async function listarDisponibles(operadorIdExcluido) {
  const { rows } = await db.query(
    `SELECT * FROM camiones
     WHERE estado = 'operativo' AND (operador_asignado_id IS NULL OR operador_asignado_id = $1)
     ORDER BY placa`,
    [operadorIdExcluido || null]
  );
  return rows.map(mapRow);
}

async function crear(camion) {
  const { rows } = await db.query(
    `INSERT INTO camiones (placa, modelo, capacidad_kg, estado, zona_asignada_id, ultimo_mantenimiento, nivel_combustible, ubicacion_lat, ubicacion_lng, ubicacion_referencia)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      camion.placa,
      camion.modelo,
      Number(camion.capacidadKg) || 0,
      camion.estado || 'operativo',
      camion.zonaAsignada || null,
      camion.ultimoMantenimiento || new Date().toISOString().slice(0, 10),
      camion.nivelCombustible ?? 100,
      camion.ubicacionActual?.lat ?? -13.5292,
      camion.ubicacionActual?.lng ?? -71.955,
      camion.ubicacionActual?.referencia || 'Taller Municipal',
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

  if (cambios.placa !== undefined) agregar('placa', cambios.placa);
  if (cambios.modelo !== undefined) agregar('modelo', cambios.modelo);
  if (cambios.capacidadKg !== undefined) agregar('capacidad_kg', cambios.capacidadKg);
  if (cambios.estado !== undefined) agregar('estado', cambios.estado);
  if (cambios.zonaAsignada !== undefined) agregar('zona_asignada_id', cambios.zonaAsignada);
  if (cambios.operadorAsignado !== undefined) agregar('operador_asignado_id', cambios.operadorAsignado);
  if (cambios.ultimoMantenimiento !== undefined) agregar('ultimo_mantenimiento', cambios.ultimoMantenimiento);
  if (cambios.nivelCombustible !== undefined) agregar('nivel_combustible', cambios.nivelCombustible);
  if (cambios.ubicacionActual !== undefined) {
    if (cambios.ubicacionActual.lat !== undefined) agregar('ubicacion_lat', cambios.ubicacionActual.lat);
    if (cambios.ubicacionActual.lng !== undefined) agregar('ubicacion_lng', cambios.ubicacionActual.lng);
    if (cambios.ubicacionActual.referencia !== undefined) agregar('ubicacion_referencia', cambios.ubicacionActual.referencia);
  }

  if (asignaciones.length === 0) return buscarPorId(id);

  valores.push(id);
  const { rows } = await db.query(
    `UPDATE camiones SET ${asignaciones.join(', ')} WHERE id = $${valores.length} RETURNING *`,
    valores
  );
  return mapRow(rows[0]);
}

async function eliminar(id) {
  const { rowCount } = await db.query('DELETE FROM camiones WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { leerTodos, buscarPorId, buscarPorOperador, listarDisponibles, crear, actualizar, eliminar };
