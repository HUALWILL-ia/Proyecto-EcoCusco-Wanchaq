-- ============================================================================
-- Migración 003 — Agrega la columna `usuario_id` a `recolecciones` (identifica
-- al ciudadano cuyo residuo fue recolectado, seleccionado por el operador al
-- registrar la recolección) y dispara notificación al ciudadano.
--
-- Segura de ejecutar sobre una base de datos "eccoCusco" que YA existe y tiene
-- datos: usa IF NOT EXISTS, no borra ni modifica filas existentes.
--
-- Cómo aplicarla:
--   psql -U postgres -h localhost -d eccoCusco -f migraciones/003_agregar_usuario_recolecciones.sql
-- ============================================================================

ALTER TABLE recolecciones
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN recolecciones.usuario_id IS 'Ciudadano identificado como generador de esta recolección (opcional, seleccionado por el operador al registrar).';

CREATE INDEX IF NOT EXISTS idx_recolecciones_usuario ON recolecciones(usuario_id);
