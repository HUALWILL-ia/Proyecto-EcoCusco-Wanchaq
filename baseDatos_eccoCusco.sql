-- ============================================================================
-- EcoRutas Wanchaq — Base de datos "eccoCusco"  (FASE 3)
-- Municipalidad Distrital de Wanchaq, Cusco.
--
-- Este archivo es AUTOCONTENIDO: crea todo el esquema, los tipos ENUM, los
-- índices, las funciones/triggers de auditoría e integridad, y siembra datos
-- reales del distrito de Wanchaq. Está pensado para ejecutarse de principio
-- a fin con psql, sin dependencias externas.
--
-- ----------------------------------------------------------------------------
-- CÓMO CREAR LA BASE DE DATOS ANTES DE CORRER ESTE SCRIPT
-- ----------------------------------------------------------------------------
-- 1) Conéctate a PostgreSQL como un superusuario (ej. "postgres") y crea la
--    base de datos vacía (esto NO se puede hacer dentro de una transacción ni
--    del mismo script que usa la base, por eso queda comentado y aparte):
--
--      CREATE DATABASE "eccoCusco"
--        WITH ENCODING = 'UTF8'
--        LC_COLLATE = 'es_PE.UTF-8'
--        LC_CTYPE   = 'es_PE.UTF-8'
--        TEMPLATE = template0;
--
--    Si tu instalación de PostgreSQL no tiene el locale "es_PE.UTF-8"
--    disponible (es común en Windows), simplemente omite las cláusulas
--    LC_COLLATE/LC_CTYPE y usa:
--
--      CREATE DATABASE "eccoCusco" WITH ENCODING = 'UTF8' TEMPLATE = template0;
--
-- 2) Ejecuta este script completo contra esa base de datos recién creada:
--
--      psql -U postgres -h localhost -d eccoCusco -f baseDatos_eccoCusco.sql
--
--    (En Windows, si "psql" no está en el PATH, usa la ruta completa, algo
--    como "C:\Program Files\PostgreSQL\17\bin\psql.exe").
--
-- Al final de este archivo, en un bloque de comentarios, encontrarás ejemplos
-- listos para pegar en una sesión de psql que demuestran el disparo de cada
-- trigger (incluyendo casos que DEBEN fallar) — útil para la sustentación.
-- ============================================================================


-- ============================================================================
-- SECCIÓN 1 — TIPOS ENUM
-- ============================================================================

CREATE TYPE rol_usuario AS ENUM ('ciudadano', 'operador', 'admin');
CREATE TYPE estado_usuario AS ENUM ('activo', 'inactivo');
CREATE TYPE estado_zona AS ENUM ('activa', 'inactiva');
CREATE TYPE estado_incidencia AS ENUM ('pendiente', 'en_atencion', 'resuelta');
CREATE TYPE estado_ruta AS ENUM ('pendiente', 'en_progreso', 'completada');
CREATE TYPE estado_camion AS ENUM ('operativo', 'mantenimiento');


-- ============================================================================
-- SECCIÓN 2 — TABLAS
-- (orden pensado para respetar dependencias de llaves foráneas; la relación
--  circular camiones <-> usuarios se resuelve agregando esa FK con ALTER TABLE
--  más abajo, una vez que ambas tablas ya existen)
-- ============================================================================

-- --- Zonas de recolección ----------------------------------------------------
CREATE TABLE zonas (
    id                      SERIAL PRIMARY KEY,
    codigo                  VARCHAR(10) NOT NULL UNIQUE,        -- ej. 'ZW-01'
    nombre                  VARCHAR(100) NOT NULL,
    descripcion             TEXT,
    referencia              VARCHAR(200),
    horario_recoleccion     VARCHAR(150),
    tipo_residuo_principal  VARCHAR(50),
    contenedores            INTEGER NOT NULL DEFAULT 0,
    poblacion_estimada      INTEGER NOT NULL DEFAULT 0,
    estado                  estado_zona NOT NULL DEFAULT 'activa',
    poligono                JSONB NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON TABLE zonas IS 'Sectores/urbanizaciones del distrito de Wanchaq cubiertos por el servicio.';
COMMENT ON COLUMN zonas.poligono IS 'Arreglo de coordenadas [{"lat":..,"lng":..}, ...] que delimita el área de la zona en el mapa. Editable por el admin desde admin/zonas.html.';

-- --- Tipos de residuo ---------------------------------------------------------
CREATE TABLE tipos_residuo (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL UNIQUE,
    descripcion         TEXT,
    color               VARCHAR(10),
    icono               VARCHAR(10),
    dias_recomendados   TEXT[] NOT NULL DEFAULT '{}',
    contenedor          VARCHAR(100)
);

-- --- Camiones (flota municipal) ----------------------------------------------
-- operador_asignado_id se agrega más abajo con ALTER TABLE (depende de "usuarios").
CREATE TABLE camiones (
    id                      SERIAL PRIMARY KEY,
    placa                   VARCHAR(15) NOT NULL UNIQUE,
    modelo                  VARCHAR(150) NOT NULL,
    capacidad_kg            INTEGER NOT NULL DEFAULT 0,
    estado                  estado_camion NOT NULL DEFAULT 'operativo',
    operador_asignado_id    INTEGER,                                  -- FK agregada después
    zona_asignada_id        INTEGER REFERENCES zonas(id) ON DELETE SET NULL,
    ultimo_mantenimiento    DATE,
    nivel_combustible       INTEGER NOT NULL DEFAULT 100,
    ubicacion_lat           NUMERIC(10, 7),
    ubicacion_lng           NUMERIC(10, 7),
    ubicacion_referencia    VARCHAR(200),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --- Usuarios (ciudadanos, operadores, admin) ---------------------------------
CREATE TABLE usuarios (
    id                      SERIAL PRIMARY KEY,
    rol                     rol_usuario NOT NULL,
    nombres                 VARCHAR(120) NOT NULL,
    apellidos               VARCHAR(120) NOT NULL,
    cargo                   VARCHAR(150),
    dni                     VARCHAR(8) NOT NULL UNIQUE,
    correo                  VARCHAR(150) NOT NULL UNIQUE,
    password_hash           VARCHAR(200) NOT NULL,
    telefono                VARCHAR(20),
    zona_id                 INTEGER REFERENCES zonas(id) ON DELETE SET NULL,
    direccion               VARCHAR(200),
    latitud                 NUMERIC(10, 7),
    longitud                NUMERIC(10, 7),
    nivel_ecologico         VARCHAR(30) DEFAULT 'Eco Semilla',
    kg_reciclados           NUMERIC(10, 2) NOT NULL DEFAULT 0,
    foto_perfil             VARCHAR(300),
    camion_id               INTEGER REFERENCES camiones(id) ON DELETE SET NULL,
    creado_por              INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    estado                  estado_usuario NOT NULL DEFAULT 'activo',
    requiere_2fa            BOOLEAN NOT NULL DEFAULT FALSE,
    debe_cambiar_password   BOOLEAN NOT NULL DEFAULT FALSE,
    creado_el               TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN usuarios.telefono IS 'Celular peruano (9 dígitos, empieza en 9), validado en el backend al crear/editar la cuenta.';
COMMENT ON COLUMN usuarios.zona_id IS 'Zona de residencia (ciudadano) o zona asignada (operador).';
-- Asignación operador -> camión: se eligió la FK directa (usuarios.camion_id)
-- en vez de una relación indirecta a través de rutas.camion_id, porque un
-- operador puede tener un camión asignado ANTES de que exista o se le
-- asigne una ruta concreta (ej. recién contratado), y porque el admin ya
-- gestiona esta asignación desde el alta/edición del operador, no desde la
-- pantalla de rutas. camiones.operador_asignado_id es la relación inversa
-- (mismo vínculo, dirección contraria) y el backend la mantiene sincronizada
-- en cada alta/reasignación (ver usuarios.controller.js: crearOperador y
-- asignarOperador) para que ambos lados coincidan siempre.
COMMENT ON COLUMN usuarios.camion_id IS 'Camión asignado (solo aplica a operadores). Ver comentario arriba: es el lado autoritativo de la asignación; camiones.operador_asignado_id se mantiene sincronizado desde el backend.';
COMMENT ON COLUMN usuarios.latitud IS 'Coordenada GPS opcional de la dirección del ciudadano (capturada con navigator.geolocation), para afinar el ETA del camión.';
COMMENT ON COLUMN usuarios.longitud IS 'Coordenada GPS opcional de la dirección del ciudadano (capturada con navigator.geolocation), para afinar el ETA del camión.';
COMMENT ON COLUMN usuarios.foto_perfil IS 'Ruta del archivo de foto de perfil subido vía PUT /api/usuarios/perfil/foto (cualquier rol).';

-- Ahora sí podemos cerrar la relación circular camiones -> usuarios:
ALTER TABLE camiones
    ADD CONSTRAINT fk_camiones_operador
    FOREIGN KEY (operador_asignado_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- --- Rutas de recolección ------------------------------------------------------
CREATE TABLE rutas (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    zona_id     INTEGER REFERENCES zonas(id) ON DELETE SET NULL,
    camion_id   INTEGER REFERENCES camiones(id) ON DELETE SET NULL,
    operador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    turno       VARCHAR(100),
    estado      estado_ruta NOT NULL DEFAULT 'pendiente',
    progreso    INTEGER NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
    -- Puntos de recolección como arreglo JSONB: [{ "orden":1, "direccion":"...", "completado":false }, ...]
    -- (se mantiene como JSONB, en vez de una tabla aparte, para que el backend
    -- pueda leer/escribir el mismo arreglo que ya usaban los controladores de Fase 2).
    puntos      JSONB NOT NULL DEFAULT '[]'::jsonb,
    creado_el   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --- Incidencias -----------------------------------------------------------------
CREATE TABLE incidencias (
    id              SERIAL PRIMARY KEY,
    tipo            VARCHAR(100) NOT NULL,
    descripcion     TEXT NOT NULL,
    zona            VARCHAR(100),                 -- nombre de la zona (texto libre, como lo envía el formulario)
    direccion       VARCHAR(200) NOT NULL,
    reportado_por   INTEGER REFERENCES usuarios(id) ON DELETE RESTRICT,
    rol_reporta     VARCHAR(20) NOT NULL CHECK (rol_reporta IN ('ciudadano', 'operador')),
    estado          estado_incidencia NOT NULL DEFAULT 'pendiente',
    prioridad       VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    foto_url        VARCHAR(300),
    geolocalizacion JSONB,
    notas_internas  JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --- Historial de estados de incidencias (llenado por trigger) -------------------
CREATE TABLE incidencias_historial (
    id              SERIAL PRIMARY KEY,
    incidencia_id   INTEGER NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    estado_anterior estado_incidencia,
    estado_nuevo    estado_incidencia,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- --- Recolecciones (registro diario del operador) --------------------------------
CREATE TABLE recolecciones (
    id              SERIAL PRIMARY KEY,
    operador_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    usuario_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ruta_id         INTEGER REFERENCES rutas(id) ON DELETE SET NULL,
    ruta_nombre     VARCHAR(150),
    tipo_residuo    VARCHAR(100) NOT NULL,
    kg              NUMERIC(10, 2) NOT NULL CHECK (kg > 0),
    observaciones   TEXT,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN recolecciones.usuario_id IS 'Ciudadano identificado como generador de esta recolección (opcional, seleccionado por el operador al registrar).';

-- --- Notificaciones ----------------------------------------------------------------
CREATE TABLE notificaciones (
    id           SERIAL PRIMARY KEY,
    para_rol     VARCHAR(20) NOT NULL,
    para_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo       VARCHAR(150) NOT NULL,
    mensaje      TEXT NOT NULL,
    tipo         VARCHAR(20) NOT NULL DEFAULT 'info',
    leida        BOOLEAN NOT NULL DEFAULT FALSE,
    fecha        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --- Preferencias de notificación --------------------------------------------------
CREATE TABLE preferencias_notificacion (
    usuario_id           INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    email_recoleccion    BOOLEAN NOT NULL DEFAULT TRUE,
    email_incidencias    BOOLEAN NOT NULL DEFAULT TRUE,
    push_notificaciones  BOOLEAN NOT NULL DEFAULT TRUE
);

-- --- Códigos de verificación 2FA -----------------------------------------------------
CREATE TABLE codigos_verificacion_2fa (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo      VARCHAR(6) NOT NULL,
    expira_el   TIMESTAMP NOT NULL,
    usado       BOOLEAN NOT NULL DEFAULT FALSE,
    creado_el   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- --- Ubicaciones GPS (una fila = última posición conocida por ruta) ------------------
CREATE TABLE ubicaciones_gps (
    id          SERIAL PRIMARY KEY,
    ruta_id     INTEGER NOT NULL UNIQUE REFERENCES rutas(id) ON DELETE CASCADE,
    camion_id   INTEGER REFERENCES camiones(id) ON DELETE CASCADE,
    operador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    lat         NUMERIC(10, 7) NOT NULL,
    lng         NUMERIC(10, 7) NOT NULL,
    velocidad   NUMERIC(6, 2),
    fecha       TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ubicaciones_gps IS 'Última posición GPS conocida por ruta (UPSERT en cada actualización del operador).';

-- --- Auditoría genérica ------------------------------------------------------------
CREATE TABLE auditoria (
    id                SERIAL PRIMARY KEY,
    tabla_afectada    VARCHAR(50) NOT NULL,
    operacion         VARCHAR(10) NOT NULL,
    registro_id       INTEGER,
    usuario_id        INTEGER,
    datos_anteriores  JSONB,
    datos_nuevos      JSONB,
    fecha             TIMESTAMP DEFAULT NOW()
);


-- ============================================================================
-- SECCIÓN 3 — ÍNDICES
-- ============================================================================

CREATE INDEX idx_usuarios_correo        ON usuarios(correo);
CREATE INDEX idx_usuarios_dni           ON usuarios(dni);
CREATE INDEX idx_usuarios_zona          ON usuarios(zona_id);
CREATE INDEX idx_usuarios_rol           ON usuarios(rol);

CREATE INDEX idx_camiones_zona          ON camiones(zona_asignada_id);
CREATE INDEX idx_camiones_operador      ON camiones(operador_asignado_id);

CREATE INDEX idx_rutas_zona             ON rutas(zona_id);
CREATE INDEX idx_rutas_operador         ON rutas(operador_id);
CREATE INDEX idx_rutas_camion           ON rutas(camion_id);

CREATE INDEX idx_incidencias_fecha      ON incidencias(fecha);
CREATE INDEX idx_incidencias_reportante ON incidencias(reportado_por);
CREATE INDEX idx_incidencias_estado     ON incidencias(estado);

CREATE INDEX idx_incidencias_hist_inc   ON incidencias_historial(incidencia_id);

CREATE INDEX idx_recolecciones_fecha    ON recolecciones(fecha);
CREATE INDEX idx_recolecciones_ruta     ON recolecciones(ruta_id);
CREATE INDEX idx_recolecciones_operador ON recolecciones(operador_id);
CREATE INDEX idx_recolecciones_usuario  ON recolecciones(usuario_id);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(para_usuario);
CREATE INDEX idx_notificaciones_fecha   ON notificaciones(fecha);

CREATE INDEX idx_codigos2fa_usuario     ON codigos_verificacion_2fa(usuario_id);

CREATE INDEX idx_gps_ruta               ON ubicaciones_gps(ruta_id);
CREATE INDEX idx_gps_fecha              ON ubicaciones_gps(fecha);

CREATE INDEX idx_auditoria_tabla        ON auditoria(tabla_afectada);
CREATE INDEX idx_auditoria_fecha        ON auditoria(fecha);


-- ============================================================================
-- SECCIÓN 4 — TRIGGERS Y AUDITORÍA
-- (requisito académico: reglas de negocio a nivel de base de datos +
--  historial verificable de cambios)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 — Auditoría genérica (AFTER INSERT/UPDATE/DELETE)
-- ----------------------------------------------------------------------------
-- El backend, antes de cada operación de escritura relevante, ejecuta:
--   SELECT set_config('app.current_user_id', '<id del usuario autenticado>', true);
-- dentro de la misma conexión/transacción, para que la auditoría (y el
-- historial de incidencias) sepan QUIÉN hizo el cambio. Si no se configura
-- (ej. durante el seed de datos), usuario_id queda en NULL.

CREATE OR REPLACE FUNCTION registrar_auditoria() RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id   INTEGER;
    v_anteriores   JSONB;
    v_nuevos       JSONB;
BEGIN
    BEGIN
        v_usuario_id := NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := NULL;
    END;

    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_anteriores := row_to_json(OLD)::jsonb;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_nuevos := row_to_json(NEW)::jsonb;
    END IF;

    -- Nunca se audita el hash de la contraseña en texto plano dentro del JSON.
    IF TG_TABLE_NAME = 'usuarios' THEN
        IF v_anteriores IS NOT NULL THEN v_anteriores := v_anteriores - 'password_hash'; END IF;
        IF v_nuevos     IS NOT NULL THEN v_nuevos     := v_nuevos     - 'password_hash'; END IF;
    END IF;

    INSERT INTO auditoria (tabla_afectada, operacion, registro_id, usuario_id, datos_anteriores, datos_nuevos)
    VALUES (TG_TABLE_NAME, TG_OP, COALESCE(NEW.id, OLD.id), v_usuario_id, v_anteriores, v_nuevos);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION registrar_auditoria() IS
    'Función de trigger genérica y reutilizable: guarda el estado antes/después de cada fila en la tabla auditoria.';

CREATE TRIGGER trg_auditoria_usuarios
    AFTER INSERT OR UPDATE OR DELETE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER trg_auditoria_recolecciones
    AFTER INSERT OR UPDATE OR DELETE ON recolecciones
    FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER trg_auditoria_incidencias
    AFTER INSERT OR UPDATE OR DELETE ON incidencias
    FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER trg_auditoria_rutas
    AFTER INSERT OR UPDATE OR DELETE ON rutas
    FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();

CREATE TRIGGER trg_auditoria_camiones
    AFTER INSERT OR UPDATE OR DELETE ON camiones
    FOR EACH ROW EXECUTE FUNCTION registrar_auditoria();


-- ----------------------------------------------------------------------------
-- 4.2 (a) — Validación de zona activa al asignar zona_id a un usuario
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_zona_activa() RETURNS TRIGGER AS $$
DECLARE
    v_estado estado_zona;
BEGIN
    IF NEW.zona_id IS NOT NULL THEN
        SELECT estado INTO v_estado FROM zonas WHERE id = NEW.zona_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No se puede asignar una zona inactiva o inexistente (zona_id=%).', NEW.zona_id;
        END IF;

        IF v_estado <> 'activa' THEN
            RAISE EXCEPTION 'No se puede asignar una zona inactiva o inexistente (zona_id=%).', NEW.zona_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_zona_usuarios
    BEFORE INSERT OR UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION validar_zona_activa();


-- ----------------------------------------------------------------------------
-- 4.2 (b) — Respaldo de validación de duplicados (correo/DNI) con mensaje claro
-- ----------------------------------------------------------------------------
-- Las restricciones UNIQUE ya existen (correo, dni); este trigger es una capa
-- adicional que da un mensaje entendible ANTES de llegar al error genérico de
-- PostgreSQL ("duplicate key value violates unique constraint ...").
CREATE OR REPLACE FUNCTION validar_duplicados_usuario() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM usuarios WHERE correo = NEW.correo) THEN
        RAISE EXCEPTION 'Ya existe una cuenta registrada con el correo %.', NEW.correo;
    END IF;
    IF EXISTS (SELECT 1 FROM usuarios WHERE dni = NEW.dni) THEN
        RAISE EXCEPTION 'Ya existe una cuenta registrada con el DNI %.', NEW.dni;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_duplicados_usuarios
    BEFORE INSERT ON usuarios
    FOR EACH ROW EXECUTE FUNCTION validar_duplicados_usuario();


-- ----------------------------------------------------------------------------
-- 4.2 (c) — Historial automático de cambios de estado en incidencias
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_historial_incidencia() RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id INTEGER;
BEGIN
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
        BEGIN
            v_usuario_id := NULLIF(current_setting('app.current_user_id', true), '')::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            v_usuario_id := NULL;
        END;

        INSERT INTO incidencias_historial (incidencia_id, estado_anterior, estado_nuevo, usuario_id)
        VALUES (NEW.id, OLD.estado, NEW.estado, v_usuario_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_incidencias
    AFTER UPDATE ON incidencias
    FOR EACH ROW EXECUTE FUNCTION registrar_historial_incidencia();


-- ----------------------------------------------------------------------------
-- 4.2 (d) — updated_at automático
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION actualizar_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_updated_at_usuarios
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_updated_at_rutas
    BEFORE UPDATE ON rutas
    FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_updated_at_camiones
    BEFORE UPDATE ON camiones
    FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_updated_at_incidencias
    BEFORE UPDATE ON incidencias
    FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();


-- ----------------------------------------------------------------------------
-- 4.2 (e) — Notificación automática a los ciudadanos de la zona al completar una ruta
-- ----------------------------------------------------------------------------
-- Nota: en el enunciado original el estado de referencia es "finalizada"; en
-- este proyecto el estado equivalente usado de punta a punta (Fase 1 y Fase 2,
-- frontend incluido) es "completada". Se respeta ese valor para no romper la
-- aplicación ya construida — el disparador (evento de negocio) es el mismo:
-- una ruta que termina genera notificación automática a los vecinos de su zona.
CREATE OR REPLACE FUNCTION notificar_ruta_completada() RETURNS TRIGGER AS $$
DECLARE
    v_zona_nombre VARCHAR;
BEGIN
    IF NEW.estado = 'completada' AND OLD.estado IS DISTINCT FROM 'completada' THEN
        SELECT nombre INTO v_zona_nombre FROM zonas WHERE id = NEW.zona_id;

        INSERT INTO notificaciones (para_rol, para_usuario, titulo, mensaje, tipo, leida, fecha)
        SELECT
            'ciudadano',
            u.id,
            'Recolección completada',
            CONCAT('La recolección de tu zona (', COALESCE(v_zona_nombre, 'tu zona'), ') fue completada — ruta "', NEW.nombre, '".'),
            'success',
            FALSE,
            NOW()
        FROM usuarios u
        WHERE u.rol = 'ciudadano' AND u.zona_id = NEW.zona_id AND u.estado = 'activo';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notificar_ruta_completada
    AFTER UPDATE ON rutas
    FOR EACH ROW EXECUTE FUNCTION notificar_ruta_completada();


-- ----------------------------------------------------------------------------
-- 4.2 (f) — Bloqueo de eliminación física de usuarios con historial
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bloquear_eliminacion_usuario_con_historial() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM recolecciones WHERE operador_id = OLD.id) THEN
        RAISE EXCEPTION 'No se puede eliminar al usuario % (%): tiene recolecciones registradas. Usa el campo estado (activo/inactivo) en vez de eliminarlo.', OLD.correo, OLD.id;
    END IF;
    IF EXISTS (SELECT 1 FROM incidencias WHERE reportado_por = OLD.id) THEN
        RAISE EXCEPTION 'No se puede eliminar al usuario % (%): tiene incidencias registradas. Usa el campo estado (activo/inactivo) en vez de eliminarlo.', OLD.correo, OLD.id;
    END IF;
    IF EXISTS (SELECT 1 FROM rutas WHERE operador_id = OLD.id) THEN
        RAISE EXCEPTION 'No se puede eliminar al usuario % (%): tiene rutas asignadas. Usa el campo estado (activo/inactivo) en vez de eliminarlo.', OLD.correo, OLD.id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bloquear_eliminacion_usuarios
    BEFORE DELETE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION bloquear_eliminacion_usuario_con_historial();


-- ----------------------------------------------------------------------------
-- 4.2 (g) — Coherencia camión/ruta: no asignar un camión en mantenimiento a una ruta activa
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_camion_para_ruta() RETURNS TRIGGER AS $$
DECLARE
    v_estado_camion estado_camion;
BEGIN
    IF NEW.camion_id IS NOT NULL THEN
        SELECT estado INTO v_estado_camion FROM camiones WHERE id = NEW.camion_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'El camión asignado (id=%) no existe.', NEW.camion_id;
        END IF;

        IF v_estado_camion = 'mantenimiento' AND NEW.estado <> 'pendiente' THEN
            RAISE EXCEPTION 'No se puede asignar el camión (id=%) a una ruta activa: está en mantenimiento.', NEW.camion_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_camion_rutas
    BEFORE INSERT OR UPDATE ON rutas
    FOR EACH ROW EXECUTE FUNCTION validar_camion_para_ruta();


-- ============================================================================
-- SECCIÓN 5 — DATOS SEMILLA (contenido real del distrito de Wanchaq)
-- ============================================================================

-- --- 5.1 Zonas de recolección --------------------------------------------------
-- NOTA IMPORTANTE sobre la columna `poligono`: las coordenadas de abajo son
-- RECTÁNGULOS DE EJEMPLO dispuestos en una cuadrícula 3x3 no solapada alrededor
-- del distrito de Wanchaq — sirven para que el mapa tenga algo que dibujar desde
-- el primer arranque del sistema, pero NO son los límites reales de cada zona.
-- El administrador debe reemplazarlos con las coordenadas reales del distrito
-- (usando el editor de polígonos en admin/zonas.html) antes de usar el sistema
-- en producción.
INSERT INTO zonas (codigo, nombre, descripcion, referencia, horario_recoleccion, tipo_residuo_principal, contenedores, poblacion_estimada, poligono) VALUES
('ZW-01', 'Centro Wanchaq',  'Casco urbano central, comercios y oficinas administrativas.',                 'Av. Los Incas / Plaza Túpac Amaru',            'Lunes, Miércoles y Viernes — 07:00 a 09:00', 'Mixto',      18, 4200,
 '[{"lat":-13.518,"lng":-71.965},{"lat":-13.518,"lng":-71.956},{"lat":-13.526,"lng":-71.956},{"lat":-13.526,"lng":-71.965}]'::jsonb),
('ZW-02', 'Manuel Prado',    'Urbanización residencial consolidada.',                                       'Urb. Manuel Prado, altura de Av. La Cultura',  'Martes, Jueves y Sábado — 08:00 a 10:00',    'Orgánico',   14, 3100,
 '[{"lat":-13.518,"lng":-71.955},{"lat":-13.518,"lng":-71.946},{"lat":-13.526,"lng":-71.946},{"lat":-13.526,"lng":-71.955}]'::jsonb),
('ZW-03', 'Miravalle',       'Zona residencial en ladera, acceso vehicular restringido en tramos altos.',   'Prolongación Av. Miravalle',                   'Lunes, Miércoles y Viernes — 09:30 a 11:30', 'Mixto',      10, 2600,
 '[{"lat":-13.527,"lng":-71.965},{"lat":-13.527,"lng":-71.956},{"lat":-13.535,"lng":-71.956},{"lat":-13.535,"lng":-71.965}]'::jsonb),
('ZW-04', E'T\'ío',          'Sector semi-urbano próximo a áreas verdes.',                                  E'Vía T\'ío, altura del paradero Amauta',       'Martes y Sábado — 07:30 a 09:00',            'Orgánico',    8, 1800,
 '[{"lat":-13.536,"lng":-71.965},{"lat":-13.536,"lng":-71.956},{"lat":-13.544,"lng":-71.956},{"lat":-13.544,"lng":-71.965}]'::jsonb),
('ZW-05', 'Magisterio',      'Urbanización docente, alta densidad residencial.',                            'Urb. Magisterio, Av. La Cultura tramo Wanchaq','Lunes, Jueves y Sábado — 08:00 a 10:00',     'Reciclable', 16, 3400,
 '[{"lat":-13.518,"lng":-71.945},{"lat":-13.518,"lng":-71.936},{"lat":-13.526,"lng":-71.936},{"lat":-13.526,"lng":-71.945}]'::jsonb),
('ZW-06', 'Balconcillo',     'Zona comercial y residencial mixta cercana a la estación ferroviaria.',       'Av. Ferrocarril / Balconcillo Bajo',           'Martes, Jueves y Sábado — 06:30 a 08:30',    'Mixto',      12, 2900,
 '[{"lat":-13.527,"lng":-71.955},{"lat":-13.527,"lng":-71.946},{"lat":-13.535,"lng":-71.946},{"lat":-13.535,"lng":-71.955}]'::jsonb),
('ZW-07', 'Marcavalle',      'Sector residencial consolidado con áreas de comercio local.',                 'Av. Marcavalle / Jr. Los Cipreses',            'Lunes, Miércoles y Viernes — 08:00 a 10:00', 'Reciclable', 11, 2500,
 '[{"lat":-13.527,"lng":-71.945},{"lat":-13.527,"lng":-71.936},{"lat":-13.535,"lng":-71.936},{"lat":-13.535,"lng":-71.945}]'::jsonb),
('ZW-08', 'Villa Mejorada',  'Asentamiento residencial en expansión.',                                      'Jr. Villa Mejorada, altura del Colegio San Antonio', 'Martes y Viernes — 09:00 a 11:00',     'Mixto',       9, 2100,
 '[{"lat":-13.536,"lng":-71.955},{"lat":-13.536,"lng":-71.946},{"lat":-13.544,"lng":-71.946},{"lat":-13.544,"lng":-71.955}]'::jsonb),
('ZW-09', 'Independencia',   'Sector residencial próximo al límite con el distrito de Cusco.',              'Av. Independencia / Jr. Tres de Mayo',         'Lunes, Jueves y Sábado — 07:00 a 09:00',     'Orgánico',   13, 2800,
 '[{"lat":-13.536,"lng":-71.945},{"lat":-13.536,"lng":-71.936},{"lat":-13.544,"lng":-71.936},{"lat":-13.544,"lng":-71.945}]'::jsonb);

-- --- 5.2 Tipos de residuo -------------------------------------------------------
INSERT INTO tipos_residuo (nombre, descripcion, color, icono, dias_recomendados, contenedor) VALUES
('Orgánico',                'Restos de alimentos, cáscaras, poda de jardín.',              '#2c9a54', '🍃', ARRAY['Martes','Jueves','Sábado'],     'Bolsa verde / balde municipal'),
('Reciclable',              'Papel, cartón, plástico, vidrio y metales limpios.',          '#2a6fb0', '♻️', ARRAY['Lunes','Miércoles','Viernes'],  'Bolsa azul / contenedor celeste'),
('Mixto / No aprovechable', 'Residuos que no pueden separarse ni reciclarse.',             '#78897f', '🗑️', ARRAY['Lunes','Miércoles','Viernes'],  'Bolsa negra'),
('Voluminoso / Especial',   'Muebles, colchones, escombros menores (requiere coordinación).', '#d98c1f', '🛋️', ARRAY['Coordinación previa con la municipalidad'], 'Programación especial');

-- --- 5.3 Camiones de la flota municipal ------------------------------------------
INSERT INTO camiones (placa, modelo, capacidad_kg, estado, zona_asignada_id, ultimo_mantenimiento, nivel_combustible, ubicacion_lat, ubicacion_lng, ubicacion_referencia) VALUES
('WQC-101', 'Volvo FE Compactador 16m³',            8000, 'operativo',    (SELECT id FROM zonas WHERE codigo='ZW-01'), '2024-06-01', 82, -13.5231000, -71.9605000, 'Av. Los Incas, Centro Wanchaq'),
('WQC-102', 'Mercedes-Benz Atego Compactador 12m³',  6500, 'operativo',    (SELECT id FROM zonas WHERE codigo='ZW-02'), '2024-05-20', 65, -13.5325000, -71.9548000, 'Urb. Manuel Prado, Av. La Cultura'),
('WQC-103', 'Volvo FE Compactador 16m³',             8000, 'mantenimiento',(SELECT id FROM zonas WHERE codigo='ZW-05'), '2024-07-10', 40, -13.5289000, -71.9502000, 'Taller Municipal - Balconcillo'),
('WQC-104', 'Isuzu Compactador 8m³',                 4500, 'operativo',    (SELECT id FROM zonas WHERE codigo='ZW-09'), '2024-06-18', 90, -13.5265000, -71.9459000, 'Av. Independencia');

-- --- 5.4 Usuario administrador semilla --------------------------------------------
-- ATENCIÓN: contraseña en texto plano SOLO para desarrollo/pruebas: "Wanchaq2024"
-- (hash real de bcrypt, 10 rondas, generado con bcryptjs — el mismo usado en la Fase 2
-- para no invalidar las cuentas de prueba que ya conocía el equipo).
INSERT INTO usuarios (rol, nombres, apellidos, cargo, dni, correo, password_hash, telefono, estado, requiere_2fa, debe_cambiar_password) VALUES
('admin', 'Rosa Elvira', 'Quispe Mamani', 'Coordinadora de Gestión de Residuos Sólidos', '41258963', 'rquispe@munwanchaq.gob.pe',
 '$2a$10$yaJ8k0LAeU/W1NAHHWZVPeaOdMUNCZc5m7088.6ZOJ4GtgpWwglh6', '984 512 340', 'activo', TRUE, FALSE);

-- --- 5.5 Operadores semilla (contraseña de desarrollo: "Operador2024") -------------
INSERT INTO usuarios (rol, nombres, apellidos, cargo, dni, correo, password_hash, telefono, zona_id, camion_id, estado, requiere_2fa, debe_cambiar_password, creado_por) VALUES
('operador', 'Juan Carlos', 'Huamán Ttito', 'Operador de Recolección - Flota Municipal', '46213578', 'jhuaman@munwanchaq.gob.pe',
 '$2a$10$hilfMWrGkSRGZPlGd4LD1.T.1qJQ3hToO4d1yq665nnQaWGGMuDWC', '984 220 115',
 (SELECT id FROM zonas WHERE codigo='ZW-02'), (SELECT id FROM camiones WHERE placa='WQC-102'),
 'activo', TRUE, FALSE, (SELECT id FROM usuarios WHERE correo='rquispe@munwanchaq.gob.pe')),
('operador', 'Elizabeth', 'Condori Farfán', 'Operadora de Recolección - Flota Municipal', '45871234', 'econdori@munwanchaq.gob.pe',
 '$2a$10$hilfMWrGkSRGZPlGd4LD1.T.1qJQ3hToO4d1yq665nnQaWGGMuDWC', '984 331 208',
 (SELECT id FROM zonas WHERE codigo='ZW-01'), (SELECT id FROM camiones WHERE placa='WQC-101'),
 'activo', TRUE, FALSE, (SELECT id FROM usuarios WHERE correo='rquispe@munwanchaq.gob.pe'));

-- Ahora que los operadores existen, se completa la asignación camión -> operador:
UPDATE camiones SET operador_asignado_id = (SELECT id FROM usuarios WHERE correo='jhuaman@munwanchaq.gob.pe') WHERE placa = 'WQC-102';
UPDATE camiones SET operador_asignado_id = (SELECT id FROM usuarios WHERE correo='econdori@munwanchaq.gob.pe') WHERE placa = 'WQC-101';

-- --- 5.6 Ciudadanos semilla (contraseña de desarrollo: "Vecino2024") -----------------
INSERT INTO usuarios (rol, nombres, apellidos, dni, correo, password_hash, telefono, zona_id, direccion, estado, nivel_ecologico, kg_reciclados) VALUES
('ciudadano', 'Mario', 'Ccahuana Serrano', '70521436', 'mario.ccahuana@gmail.com',
 '$2a$10$kQ8kHABoT5SJ1TEgcQ56aOPLrwspNc.4zjyTMJQ0ycTJzy.9C4pvS', '984 778 214',
 (SELECT id FROM zonas WHERE codigo='ZW-05'), 'Urb. Magisterio C-12', 'activo', 'Eco Bronce', 24.5),
('ciudadano', 'Fiorella', 'Zúñiga Palomino', '73145820', 'fiorella.zuniga@gmail.com',
 '$2a$10$kQ8kHABoT5SJ1TEgcQ56aOPLrwspNc.4zjyTMJQ0ycTJzy.9C4pvS', '984 902 561',
 (SELECT id FROM zonas WHERE codigo='ZW-01'), 'Av. Los Incas 245', 'activo', 'Eco Plata', 58.2);

-- --- 5.7 Rutas de ejemplo ------------------------------------------------------------
INSERT INTO rutas (nombre, zona_id, camion_id, operador_id, turno, estado, progreso, puntos) VALUES
('Ruta Centro Wanchaq - Matutina',
 (SELECT id FROM zonas WHERE codigo='ZW-01'), (SELECT id FROM camiones WHERE placa='WQC-101'),
 (SELECT id FROM usuarios WHERE correo='econdori@munwanchaq.gob.pe'), '06:30 - 09:30', 'en_progreso', 50,
 '[{"orden":1,"direccion":"Av. Los Incas cuadra 1","completado":true},
   {"orden":2,"direccion":"Plaza Túpac Amaru","completado":true},
   {"orden":3,"direccion":"Jr. Manco Cápac","completado":false},
   {"orden":4,"direccion":"Av. Huáscar","completado":false}]'::jsonb),

('Ruta Manuel Prado - Matutina',
 (SELECT id FROM zonas WHERE codigo='ZW-02'), (SELECT id FROM camiones WHERE placa='WQC-102'),
 (SELECT id FROM usuarios WHERE correo='jhuaman@munwanchaq.gob.pe'), '08:00 - 10:30', 'en_progreso', 33,
 '[{"orden":1,"direccion":"Urb. Manuel Prado A-1","completado":true},
   {"orden":2,"direccion":"Urb. Manuel Prado B-3","completado":false},
   {"orden":3,"direccion":"Av. La Cultura tramo Wanchaq","completado":false}]'::jsonb),

('Ruta Independencia - Matutina',
 (SELECT id FROM zonas WHERE codigo='ZW-09'), (SELECT id FROM camiones WHERE placa='WQC-104'),
 NULL, '07:00 - 09:00', 'pendiente', 0,
 '[{"orden":1,"direccion":"Av. Independencia cuadra 2","completado":false},
   {"orden":2,"direccion":"Jr. Tres de Mayo","completado":false}]'::jsonb);

-- --- 5.8 Incidencias de ejemplo -------------------------------------------------------
INSERT INTO incidencias (tipo, descripcion, zona, direccion, reportado_por, rol_reporta, estado, prioridad, fecha) VALUES
('Acumulación de residuos', 'Bolsas de basura acumuladas frente al parque, no recogidas hace 3 días.', 'Miravalle', 'Prolongación Av. Miravalle s/n',
 (SELECT id FROM usuarios WHERE correo='mario.ccahuana@gmail.com'), 'ciudadano', 'pendiente', 'alta', NOW() - INTERVAL '4 days'),
('Contenedor dañado', 'Contenedor municipal con tapa rota, riesgo de derrame.', 'Centro Wanchaq', 'Plaza Túpac Amaru',
 (SELECT id FROM usuarios WHERE correo='fiorella.zuniga@gmail.com'), 'ciudadano', 'en_atencion', 'media', NOW() - INTERVAL '3 days');

-- --- 5.9 Notificaciones de ejemplo -----------------------------------------------------
INSERT INTO notificaciones (para_rol, para_usuario, titulo, mensaje, tipo, leida, fecha) VALUES
('ciudadano', (SELECT id FROM usuarios WHERE correo='mario.ccahuana@gmail.com'), 'Recolección programada mañana',
 'Recuerda sacar tus residuos orgánicos antes de las 08:00 a.m. en Magisterio.', 'info', FALSE, NOW() - INTERVAL '1 day'),
('admin', (SELECT id FROM usuarios WHERE correo='rquispe@munwanchaq.gob.pe'), 'Incidencia de alta prioridad',
 'Se reportó una nueva incidencia en Miravalle.', 'warning', FALSE, NOW() - INTERVAL '4 days');


-- ============================================================================
-- FIN DEL SCRIPT EJECUTABLE
-- ============================================================================
--
-- Credenciales del admin semilla:
--   correo:      rquispe@munwanchaq.gob.pe
--   contraseña:  Wanchaq2024   (solo desarrollo — cámbiala en un entorno real)
--
-- Operadores semilla (contraseña de desarrollo: Operador2024):
--   jhuaman@munwanchaq.gob.pe / econdori@munwanchaq.gob.pe
--
-- Ciudadanos semilla (contraseña de desarrollo: Vecino2024):
--   mario.ccahuana@gmail.com / fiorella.zuniga@gmail.com
--
-- ============================================================================


-- ============================================================================
-- SECCIÓN 6 — EJEMPLOS DE VERIFICACIÓN (PARA LA SUSTENTACIÓN)
-- ----------------------------------------------------------------------------
-- Todo lo de aquí en adelante está COMENTADO a propósito: no se ejecuta al
-- correr el script completo. Cópialo y pégalo manualmente en una sesión de
-- psql (una instrucción a la vez) para demostrar que cada trigger funciona.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (a) Debe FALLAR: asignar una zona inexistente a un usuario.
-- ----------------------------------------------------------------------------
-- INSERT INTO usuarios (rol, nombres, apellidos, dni, correo, password_hash, zona_id)
-- VALUES ('ciudadano', 'Prueba', 'Zona Inexistente', '99999901', 'prueba.zona@example.com', 'x', 9999);
-- -- ERROR:  No se puede asignar una zona inactiva o inexistente (zona_id=9999).

-- Debe FALLAR también con una zona que existe pero está inactiva:
-- UPDATE zonas SET estado = 'inactiva' WHERE codigo = 'ZW-08';
-- INSERT INTO usuarios (rol, nombres, apellidos, dni, correo, password_hash, zona_id)
-- VALUES ('ciudadano', 'Prueba', 'Zona Inactiva', '99999902', 'prueba.zona2@example.com', 'x',
--         (SELECT id FROM zonas WHERE codigo = 'ZW-08'));
-- -- ERROR:  No se puede asignar una zona inactiva o inexistente (zona_id=...).
-- UPDATE zonas SET estado = 'activa' WHERE codigo = 'ZW-08'; -- deshacer para no dejar datos de prueba

-- ----------------------------------------------------------------------------
-- (b) Debe FALLAR: correo/DNI duplicado con mensaje claro (antes del error genérico de UNIQUE).
-- ----------------------------------------------------------------------------
-- INSERT INTO usuarios (rol, nombres, apellidos, dni, correo, password_hash)
-- VALUES ('ciudadano', 'Duplicado', 'De Prueba', '70521436', 'mario.ccahuana@gmail.com', 'x');
-- -- ERROR:  Ya existe una cuenta registrada con el correo mario.ccahuana@gmail.com.

-- ----------------------------------------------------------------------------
-- (c) Debe generar una fila en incidencias_historial automáticamente.
-- ----------------------------------------------------------------------------
-- SELECT set_config('app.current_user_id', (SELECT id FROM usuarios WHERE correo='rquispe@munwanchaq.gob.pe')::text, false);
-- UPDATE incidencias SET estado = 'resuelta' WHERE id = (SELECT id FROM incidencias WHERE zona = 'Centro Wanchaq' LIMIT 1);
-- SELECT * FROM incidencias_historial ORDER BY fecha DESC LIMIT 5;

-- ----------------------------------------------------------------------------
-- (d) updated_at debe cambiar solo al hacer un UPDATE.
-- ----------------------------------------------------------------------------
-- SELECT id, updated_at FROM usuarios WHERE correo = 'mario.ccahuana@gmail.com';
-- UPDATE usuarios SET telefono = '984 000 111' WHERE correo = 'mario.ccahuana@gmail.com';
-- SELECT id, updated_at FROM usuarios WHERE correo = 'mario.ccahuana@gmail.com'; -- updated_at debe ser NOW()

-- ----------------------------------------------------------------------------
-- (e) Al completar una ruta, se debe generar una notificación automática por cada
--     ciudadano activo de esa zona.
-- ----------------------------------------------------------------------------
-- UPDATE rutas SET estado = 'completada', progreso = 100
--   WHERE nombre = 'Ruta Manuel Prado - Matutina';
-- SELECT * FROM notificaciones WHERE titulo = 'Recolección completada' ORDER BY fecha DESC;

-- ----------------------------------------------------------------------------
-- (f) Debe FALLAR: eliminar un usuario que ya tiene historial asociado.
-- ----------------------------------------------------------------------------
-- DELETE FROM usuarios WHERE correo = 'jhuaman@munwanchaq.gob.pe';
-- -- ERROR:  No se puede eliminar al usuario jhuaman@munwanchaq.gob.pe (...): tiene rutas asignadas...

-- ----------------------------------------------------------------------------
-- (g) Debe FALLAR: asignar un camión en mantenimiento a una ruta activa.
-- ----------------------------------------------------------------------------
-- INSERT INTO rutas (nombre, zona_id, camion_id, estado, progreso)
-- VALUES ('Ruta de prueba con camión en mantenimiento',
--         (SELECT id FROM zonas WHERE codigo='ZW-05'),
--         (SELECT id FROM camiones WHERE placa='WQC-103'), -- este camión está 'mantenimiento'
--         'en_progreso', 10);
-- -- ERROR:  No se puede asignar el camión (id=...) a una ruta activa: está en mantenimiento.

-- ----------------------------------------------------------------------------
-- Consultas de verificación general de auditoría:
-- ----------------------------------------------------------------------------
-- SELECT * FROM auditoria ORDER BY fecha DESC LIMIT 20;
-- SELECT * FROM incidencias_historial ORDER BY fecha DESC;
-- SELECT tabla_afectada, operacion, COUNT(*) FROM auditoria GROUP BY 1,2 ORDER BY 1,2;
