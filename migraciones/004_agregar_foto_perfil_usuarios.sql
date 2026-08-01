-- ============================================================================
-- Migración 004 — Agrega la columna `foto_perfil` a `usuarios` (ruta del
-- archivo subido vía PUT /api/usuarios/perfil/foto, disponible para cualquier
-- rol autenticado: ciudadano, operador y admin).
--
-- Segura de ejecutar sobre una base de datos "eccoCusco" que YA existe y tiene
-- datos: usa IF NOT EXISTS, no borra ni modifica filas existentes.
--
-- Cómo aplicarla:
--   psql -U postgres -h localhost -d eccoCusco -f migraciones/004_agregar_foto_perfil_usuarios.sql
-- ============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS foto_perfil VARCHAR(300);

COMMENT ON COLUMN usuarios.foto_perfil IS 'Ruta del archivo de foto de perfil subido vía PUT /api/usuarios/perfil/foto (cualquier rol).';
