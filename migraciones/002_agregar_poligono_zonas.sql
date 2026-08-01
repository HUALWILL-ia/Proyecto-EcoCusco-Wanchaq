-- ============================================================================
-- Migración 002 — Agrega la columna `poligono` a `zonas` (límites territoriales
-- de cada zona para dibujarlos en el mapa junto al GPS del camión).
--
-- Segura de ejecutar sobre una base de datos "eccoCusco" que YA existe y tiene
-- datos: usa IF NOT EXISTS, no borra ni modifica filas existentes. Los
-- polígonos de ejemplo solo se insertan en las zonas semilla (ZW-01..ZW-09) que
-- todavía no tengan un polígono propio (para no pisar ediciones ya hechas desde
-- admin/zonas.html).
--
-- IMPORTANTE: los polígonos que agrega esta migración son RECTÁNGULOS DE
-- EJEMPLO en una cuadrícula no solapada — no son los límites reales del
-- distrito de Wanchaq. Reemplázalos con las coordenadas reales usando el
-- editor de polígonos en admin/zonas.html antes de usar el sistema en producción.
--
-- Cómo aplicarla:
--   psql -U postgres -h localhost -d eccoCusco -f migraciones/002_agregar_poligono_zonas.sql
-- ============================================================================

ALTER TABLE zonas
  ADD COLUMN IF NOT EXISTS poligono JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN zonas.poligono IS 'Arreglo de coordenadas [{"lat":..,"lng":..}, ...] que delimita el área de la zona en el mapa. Editable por el admin desde admin/zonas.html.';

UPDATE zonas SET poligono = '[{"lat":-13.518,"lng":-71.965},{"lat":-13.518,"lng":-71.956},{"lat":-13.526,"lng":-71.956},{"lat":-13.526,"lng":-71.965}]'::jsonb
  WHERE codigo = 'ZW-01' AND poligono = '[]'::jsonb;
UPDATE zonas SET poligono = '[{"lat":-13.518,"lng":-71.955},{"lat":-13.518,"lng":-71.946},{"lat":-13.526,"lng":-71.946},{"lat":-13.526,"lng":-71.955}]'::jsonb
  WHERE codigo = 'ZW-02' AND poligono = '[]'::jsonb;
UPDATE zonas SET poligono = '[{"lat":-13.527,"lng":-71.965},{"lat":-13.527,"lng":-71.956},{"lat":-13.535,"lng":-71.956},{"lat":-13.535,"lng":-71.965}]'::jsonb
  WHERE codigo = 'ZW-03' AND poligono = '[]'::jsonb;
UPDATE zonas SET poligono = '[{"lat":-13.536,"lng":-71.965},{"lat":-13.536,"lng":-71.956},{"lat":-13.544,"lng":-71.956},{"lat":-13.544,"lng":-71.965}]'::jsonb
  WHERE codigo = 'ZW-04' AND poligono = '[]'::jsonb;
UPDATE zonas SET poligono = '[{"lat":-13.518,"lng":-71.945},{"lat":-13.518,"lng":-71.936},{"lat":-13.526,"lng":-71.936},{"lat":-13.526,"lng":-71.945}]'::jsonb
  WHERE codigo = 'ZW-05' AND poligono = '[]'::jsonb;
UPDATE zonas SET poligono = '[{"lat":-13.527,"lng":-71.955},{"lat":-13.527,"lng":-71.946},{"lat":-13.535,"lng":-71.946},{"lat":-13.535,"lng":-71.955}]'::jsonb
  WHERE codigo = 'ZW-06' AND poligono = '[]'::jsonb;
UPDATE zonas SET poligono = '[{"lat":-13.527,"lng":-71.945},{"lat":-13.527,"lng":-71.936},{"lat":-13.535,"lng":-71.936},{"lat":-13.535,"lng":-71.945}]'::jsonb
  WHERE codigo = 'ZW-07' AND poligono = '[]'::jsonb;
UPDATE zonas SET poligono = '[{"lat":-13.536,"lng":-71.955},{"lat":-13.536,"lng":-71.946},{"lat":-13.544,"lng":-71.946},{"lat":-13.544,"lng":-71.955}]'::jsonb
  WHERE codigo = 'ZW-08' AND poligono = '[]'::jsonb;
UPDATE zonas SET poligono = '[{"lat":-13.536,"lng":-71.945},{"lat":-13.536,"lng":-71.936},{"lat":-13.544,"lng":-71.936},{"lat":-13.544,"lng":-71.945}]'::jsonb
  WHERE codigo = 'ZW-09' AND poligono = '[]'::jsonb;
