-- ============================================================================
-- Migración 001 — Agrega latitud/longitud a usuarios (ubicación exacta del
-- ciudadano dentro de su zona, capturada opcionalmente con geolocalización
-- del navegador durante el registro).
--
-- Seguro de ejecutar sobre una base de datos "eccoCusco" que YA existe y
-- tiene datos: usa IF NOT EXISTS, no borra ni modifica filas existentes.
--
-- Cómo aplicarla:
--   psql -U postgres -h localhost -d eccoCusco -f migraciones/001_agregar_ubicacion_usuarios.sql
-- ============================================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS latitud  NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitud NUMERIC(10, 7);

COMMENT ON COLUMN usuarios.latitud IS 'Coordenada GPS opcional de la dirección del ciudadano (capturada con navigator.geolocation), para afinar el ETA del camión.';
COMMENT ON COLUMN usuarios.longitud IS 'Coordenada GPS opcional de la dirección del ciudadano (capturada con navigator.geolocation), para afinar el ETA del camión.';
