/**
 * repositories/incidencias.repository.js
 * Fase 3: PostgreSQL real (tabla `incidencias`). El historial de cambios de
 * estado ya NO lo escribe este repositorio: lo genera automáticamente el
 * trigger trg_historial_incidencias en la base de datos.
 */

const db = require('../config/db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tipo: row.tipo,
    descripcion: row.descripcion,
    zona: row.zona,
    direccion: row.direccion,
    reportadoPor: row.reportado_por,
    rolReporta: row.rol_reporta,
    estado: row.estado,
    prioridad: row.prioridad,
    fecha: row.fecha,
    fotoUrl: row.foto_url,
    geolocalizacion: row.geolocalizacion,
    notasInternas: row.notas_internas || [],
    updatedAt: row.updated_at,
  };
}

async function leerTodos() {
  const { rows } = await db.query('SELECT * FROM incidencias ORDER BY fecha DESC');
  return rows.map(mapRow);
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM incidencias WHERE id = $1', [id]);
  return mapRow(rows[0]);
}

async function buscarPorUsuario(usuarioId) {
  const { rows } = await db.query('SELECT * FROM incidencias WHERE reportado_por = $1 ORDER BY fecha DESC', [usuarioId]);
  return rows.map(mapRow);
}

async function crear(incidencia) {
  const { rows } = await db.query(
    `INSERT INTO incidencias (tipo, descripcion, zona, direccion, reportado_por, rol_reporta, estado, prioridad, foto_url, geolocalizacion, notas_internas)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      incidencia.tipo,
      incidencia.descripcion,
      incidencia.zona,
      incidencia.direccion,
      incidencia.reportadoPor,
      incidencia.rolReporta,
      incidencia.estado || 'pendiente',
      incidencia.prioridad || 'media',
      incidencia.fotoUrl || null,
      incidencia.geolocalizacion ? JSON.stringify(incidencia.geolocalizacion) : null,
      JSON.stringify(incidencia.notasInternas || []),
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

  if (cambios.estado !== undefined) agregar('estado', cambios.estado);
  if (cambios.prioridad !== undefined) agregar('prioridad', cambios.prioridad);
  if (cambios.notasInternas !== undefined) agregar('notas_internas', JSON.stringify(cambios.notasInternas));

  if (asignaciones.length === 0) return buscarPorId(id);

  valores.push(id);
  const { rows } = await db.query(
    `UPDATE incidencias SET ${asignaciones.join(', ')} WHERE id = $${valores.length} RETURNING *`,
    valores
  );
  return mapRow(rows[0]);
}

/**
 * Historial de cambios de estado de una incidencia (llenado automáticamente
 * por el trigger trg_historial_incidencias en PostgreSQL).
 */
async function obtenerHistorial(incidenciaId) {
  const { rows } = await db.query(
    `SELECT h.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre
     FROM incidencias_historial h
     LEFT JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.incidencia_id = $1
     ORDER BY h.fecha DESC`,
    [incidenciaId]
  );
  return rows.map((row) => ({
    id: row.id,
    incidenciaId: row.incidencia_id,
    estadoAnterior: row.estado_anterior,
    estadoNuevo: row.estado_nuevo,
    fecha: row.fecha,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre,
  }));
}

module.exports = { leerTodos, buscarPorId, buscarPorUsuario, crear, actualizar, obtenerHistorial };
