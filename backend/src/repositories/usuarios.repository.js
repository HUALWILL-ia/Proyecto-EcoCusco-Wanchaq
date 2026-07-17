/**
 * repositories/usuarios.repository.js
 * Fase 3: PostgreSQL real (tabla `usuarios`, con JOIN a `zonas` para exponer
 * el nombre de zona de los ciudadanos). Mantiene los mismos nombres de
 * función y la misma forma (camelCase) de los objetos que la Fase 2.
 */

const db = require('../config/db');

const SELECT_BASE = `
  SELECT u.*, z.nombre AS zona_nombre
  FROM usuarios u
  LEFT JOIN zonas z ON z.id = u.zona_id
`;

function mapRow(row) {
  if (!row) return null;

  const usuario = {
    id: row.id,
    rol: row.rol,
    nombres: row.nombres,
    apellidos: row.apellidos,
    cargo: row.cargo,
    dni: row.dni,
    correo: row.correo,
    passwordHash: row.password_hash,
    telefono: row.telefono,
    estado: row.estado,
    requiere2FA: row.requiere_2fa,
    debeCambiarPassword: row.debe_cambiar_password,
    creadoEl: row.creado_el,
    updatedAt: row.updated_at,
  };

  if (row.rol === 'ciudadano') {
    usuario.zona = row.zona_nombre || null;
    usuario.direccion = row.direccion;
    usuario.nivelEcologico = row.nivel_ecologico;
    usuario.kgReciclados = row.kg_reciclados !== null ? Number(row.kg_reciclados) : 0;
  }

  if (row.rol === 'operador') {
    usuario.zonaAsignada = row.zona_id;
    usuario.camionAsignado = row.camion_id;
    usuario.creadoPor = row.creado_por;
  }

  return usuario;
}

async function buscarPorId(id) {
  const { rows } = await db.query(`${SELECT_BASE} WHERE u.id = $1`, [id]);
  return mapRow(rows[0]);
}

async function buscarPorCorreo(correo) {
  const texto = (correo || '').trim().toLowerCase();
  const { rows } = await db.query(`${SELECT_BASE} WHERE LOWER(u.correo) = $1`, [texto]);
  return mapRow(rows[0]);
}

async function buscarPorDni(dni) {
  const { rows } = await db.query(`${SELECT_BASE} WHERE u.dni = $1`, [(dni || '').trim()]);
  return mapRow(rows[0]);
}

/**
 * Busca por correo o DNI (usado en login, donde el ciudadano puede ingresar cualquiera).
 */
async function buscarPorCorreoODni(identificador) {
  const texto = (identificador || '').trim();
  const { rows } = await db.query(
    `${SELECT_BASE} WHERE LOWER(u.correo) = $1 OR u.dni = $2`,
    [texto.toLowerCase(), texto]
  );
  return mapRow(rows[0]);
}

async function existeCorreo(correo) {
  return Boolean(await buscarPorCorreo(correo));
}

async function existeDni(dni) {
  return Boolean(await buscarPorDni(dni));
}

async function listarPorRol(rol) {
  const { rows } = await db.query(`${SELECT_BASE} WHERE u.rol = $1`, [rol]);
  return rows.map(mapRow);
}

async function leerTodos() {
  const { rows } = await db.query(`${SELECT_BASE} ORDER BY u.id`);
  return rows.map(mapRow);
}

/**
 * Resuelve el nombre de una zona a su id (usado al guardar la zona de
 * residencia de un ciudadano, que llega como texto desde el frontend).
 */
async function resolverZonaIdPorNombre(nombre) {
  if (!nombre) return null;
  const { rows } = await db.query('SELECT id FROM zonas WHERE nombre = $1', [nombre]);
  return rows[0]?.id ?? null;
}

async function crear(usuario) {
  let zonaId = null;
  if (usuario.zona) {
    zonaId = await resolverZonaIdPorNombre(usuario.zona);
  } else if (usuario.zonaAsignada) {
    zonaId = usuario.zonaAsignada;
  }

  const { rows } = await db.query(
    `INSERT INTO usuarios
       (rol, nombres, apellidos, cargo, dni, correo, password_hash, telefono,
        zona_id, direccion, nivel_ecologico, kg_reciclados, camion_id,
        creado_por, estado, requiere_2fa, debe_cambiar_password)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id`,
    [
      usuario.rol,
      usuario.nombres,
      usuario.apellidos,
      usuario.cargo || null,
      usuario.dni,
      usuario.correo,
      usuario.passwordHash,
      usuario.telefono || null,
      zonaId,
      usuario.direccion || null,
      usuario.nivelEcologico || 'Eco Semilla',
      usuario.kgReciclados ?? 0,
      usuario.camionAsignado || null,
      usuario.creadoPor || null,
      usuario.estado || 'activo',
      usuario.requiere2FA ?? false,
      usuario.debeCambiarPassword ?? false,
    ]
  );
  return buscarPorId(rows[0].id);
}

const COLUMNAS_DIRECTAS = {
  nombres: 'nombres',
  apellidos: 'apellidos',
  cargo: 'cargo',
  telefono: 'telefono',
  direccion: 'direccion',
  estado: 'estado',
  passwordHash: 'password_hash',
  debeCambiarPassword: 'debe_cambiar_password',
  requiere2FA: 'requiere_2fa',
  nivelEcologico: 'nivel_ecologico',
  kgReciclados: 'kg_reciclados',
  camionAsignado: 'camion_id',
  zonaAsignada: 'zona_id',
};

async function actualizar(id, cambios) {
  const asignaciones = [];
  const valores = [];
  const agregar = (columna, valor) => {
    valores.push(valor);
    asignaciones.push(`${columna} = $${valores.length}`);
  };

  const cambiosRestantes = { ...cambios };

  // "zona" (ciudadano) llega como nombre de zona en texto -> se resuelve a zona_id.
  if (cambiosRestantes.zona !== undefined) {
    const zonaId = await resolverZonaIdPorNombre(cambiosRestantes.zona);
    agregar('zona_id', zonaId);
    delete cambiosRestantes.zona;
  }

  Object.entries(cambiosRestantes).forEach(([campo, valor]) => {
    const columna = COLUMNAS_DIRECTAS[campo];
    if (!columna) return;
    agregar(columna, valor);
  });

  if (asignaciones.length === 0) return buscarPorId(id);

  valores.push(id);
  await db.query(`UPDATE usuarios SET ${asignaciones.join(', ')} WHERE id = $${valores.length}`, valores);
  return buscarPorId(id);
}

async function eliminar(id) {
  const { rowCount } = await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
  return rowCount > 0;
}

/**
 * Quita campos sensibles (hash de contraseña) antes de enviar el usuario al cliente.
 */
function aPublico(usuario) {
  if (!usuario) return null;
  const { passwordHash, ...resto } = usuario;
  return resto;
}

module.exports = {
  leerTodos,
  buscarPorId,
  buscarPorCorreo,
  buscarPorDni,
  buscarPorCorreoODni,
  existeCorreo,
  existeDni,
  crear,
  actualizar,
  eliminar,
  listarPorRol,
  aPublico,
};
