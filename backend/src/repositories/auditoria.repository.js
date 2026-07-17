/**
 * repositories/auditoria.repository.js
 * Lectura de la tabla `auditoria` (llenada automáticamente por los triggers
 * de PostgreSQL — ver baseDatos_eccoCusco.sql, sección 4). Este repositorio
 * es de solo lectura: nada en el backend inserta aquí directamente.
 */

const db = require('../config/db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tablaAfectada: row.tabla_afectada,
    operacion: row.operacion,
    registroId: row.registro_id,
    usuarioId: row.usuario_id,
    usuarioNombre: row.usuario_nombre || null,
    datosAnteriores: row.datos_anteriores,
    datosNuevos: row.datos_nuevos,
    fecha: row.fecha,
  };
}

/**
 * Lista paginada de auditoría con filtros opcionales por tabla y rango de fechas.
 */
async function listar({ tabla, desde, hasta, pagina = 1, porPagina = 20 } = {}) {
  const condiciones = [];
  const valores = [];

  if (tabla) {
    valores.push(tabla);
    condiciones.push(`a.tabla_afectada = $${valores.length}`);
  }
  if (desde) {
    valores.push(desde);
    condiciones.push(`a.fecha >= $${valores.length}`);
  }
  if (hasta) {
    valores.push(hasta);
    condiciones.push(`a.fecha <= $${valores.length}`);
  }

  const whereSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  const { rows: filasTotal } = await db.query(`SELECT COUNT(*)::int AS total FROM auditoria a ${whereSql}`, valores);
  const total = filasTotal[0].total;

  const paginaNum = Math.max(Number(pagina) || 1, 1);
  const porPaginaNum = Math.max(Number(porPagina) || 20, 1);
  const offset = (paginaNum - 1) * porPaginaNum;

  valores.push(porPaginaNum, offset);
  const { rows } = await db.query(
    `SELECT a.*, CONCAT(u.nombres, ' ', u.apellidos) AS usuario_nombre
     FROM auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ${whereSql}
     ORDER BY a.fecha DESC
     LIMIT $${valores.length - 1} OFFSET $${valores.length}`,
    valores
  );

  return {
    datos: rows.map(mapRow),
    paginacion: { total, pagina: paginaNum, porPagina: porPaginaNum, totalPaginas: Math.ceil(total / porPaginaNum) },
  };
}

/**
 * Lista de tablas distintas presentes en la auditoría (para el filtro del frontend).
 */
async function listarTablasDisponibles() {
  const { rows } = await db.query('SELECT DISTINCT tabla_afectada FROM auditoria ORDER BY tabla_afectada');
  return rows.map((r) => r.tabla_afectada);
}

module.exports = { listar, listarTablasDisponibles };
