-- ============================================================================
-- Migración 005 — Agrega el trazado de calles a `rutas` (distinto del
-- polígono de zona: es la línea/recorrido real que sigue el camión) y
-- reemplaza los polígonos de zona / puntos de recojo de ejemplo por formas
-- más orgánicas (8 puntos) e ilustrativas, en vez de los rectángulos
-- perfectos originales.
--
-- Segura de ejecutar sobre una base de datos "eccoCusco" que YA existe y
-- tiene datos: usa IF NOT EXISTS para la columna nueva, y los UPDATE de abajo
-- solo tocan las filas semilla identificadas por su `codigo`/`nombre` (si ya
-- las editaste manualmente desde el admin, este script las sobrescribirá con
-- estos valores de ejemplo -- sáltate los UPDATE si no quieres eso).
--
-- Cómo aplicarla:
--   psql -U postgres -h localhost -d eccoCusco -f migraciones/005_agregar_trazado_rutas_y_mejorar_poligonos.sql
-- (o pégalo en el SQL Editor de Neon/tu proveedor de PostgreSQL gestionado)
-- ============================================================================

ALTER TABLE rutas
  ADD COLUMN IF NOT EXISTS trazado JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN rutas.trazado IS 'Recorrido real de calles del camión dentro de su zona (polilínea): [{"lat":..,"lng":..}, ...]. Distinto de zonas.poligono (área general). Ilustrativo -- el admin debe ajustarlo con datos reales.';

-- --- Polígonos de zona más orgánicos (8 puntos en vez de rectángulos) ------
UPDATE zonas SET poligono = '[{"lat":-13.522,"lng":-71.956244},{"lat":-13.519961,"lng":-71.958206},{"lat":-13.51836,"lng":-71.9605},{"lat":-13.518965,"lng":-71.963915},{"lat":-13.522,"lng":-71.965309},{"lat":-13.524323,"lng":-71.963113},{"lat":-13.525762,"lng":-71.9605},{"lat":-13.52477,"lng":-71.957383}]'::jsonb WHERE codigo = 'ZW-01';
UPDATE zonas SET poligono = '[{"lat":-13.522,"lng":-71.946071},{"lat":-13.519633,"lng":-71.947837},{"lat":-13.518709,"lng":-71.9505},{"lat":-13.519416,"lng":-71.953407},{"lat":-13.522,"lng":-71.955158},{"lat":-13.524679,"lng":-71.953514},{"lat":-13.525599,"lng":-71.9505},{"lat":-13.5244,"lng":-71.9478}]'::jsonb WHERE codigo = 'ZW-02';
UPDATE zonas SET poligono = '[{"lat":-13.531,"lng":-71.956093},{"lat":-13.528924,"lng":-71.958165},{"lat":-13.527463,"lng":-71.9605},{"lat":-13.528887,"lng":-71.962877},{"lat":-13.531,"lng":-71.964976},{"lat":-13.533526,"lng":-71.963342},{"lat":-13.534581,"lng":-71.9605},{"lat":-13.533201,"lng":-71.958024}]'::jsonb WHERE codigo = 'ZW-03';
UPDATE zonas SET poligono = '[{"lat":-13.54,"lng":-71.955764},{"lat":-13.537624,"lng":-71.957827},{"lat":-13.536801,"lng":-71.9605},{"lat":-13.53788,"lng":-71.962885},{"lat":-13.54,"lng":-71.964119},{"lat":-13.542554,"lng":-71.963374},{"lat":-13.542991,"lng":-71.9605},{"lat":-13.543028,"lng":-71.957093}]'::jsonb WHERE codigo = 'ZW-04';
UPDATE zonas SET poligono = '[{"lat":-13.522,"lng":-71.936143},{"lat":-13.519177,"lng":-71.937324},{"lat":-13.518804,"lng":-71.9405},{"lat":-13.519329,"lng":-71.943505},{"lat":-13.522,"lng":-71.943878},{"lat":-13.524639,"lng":-71.943469},{"lat":-13.525917,"lng":-71.9405},{"lat":-13.524503,"lng":-71.937684}]'::jsonb WHERE codigo = 'ZW-05';
UPDATE zonas SET poligono = '[{"lat":-13.531,"lng":-71.946408},{"lat":-13.528961,"lng":-71.948206},{"lat":-13.527165,"lng":-71.9505},{"lat":-13.528758,"lng":-71.953023},{"lat":-13.531,"lng":-71.954618},{"lat":-13.533109,"lng":-71.952872},{"lat":-13.533887,"lng":-71.9505},{"lat":-13.533974,"lng":-71.947154}]'::jsonb WHERE codigo = 'ZW-06';
UPDATE zonas SET poligono = '[{"lat":-13.531,"lng":-71.937241},{"lat":-13.5289,"lng":-71.938138},{"lat":-13.526713,"lng":-71.9405},{"lat":-13.528252,"lng":-71.943592},{"lat":-13.531,"lng":-71.944585},{"lat":-13.533449,"lng":-71.943256},{"lat":-13.534551,"lng":-71.9405},{"lat":-13.533281,"lng":-71.937934}]'::jsonb WHERE codigo = 'ZW-07';
UPDATE zonas SET poligono = '[{"lat":-13.54,"lng":-71.947007},{"lat":-13.537327,"lng":-71.947493},{"lat":-13.536687,"lng":-71.9505},{"lat":-13.537255,"lng":-71.953588},{"lat":-13.54,"lng":-71.954688},{"lat":-13.542494,"lng":-71.953306},{"lat":-13.544059,"lng":-71.9505},{"lat":-13.54228,"lng":-71.947935}]'::jsonb WHERE codigo = 'ZW-08';
UPDATE zonas SET poligono = '[{"lat":-13.54,"lng":-71.936938},{"lat":-13.537097,"lng":-71.937234},{"lat":-13.536916,"lng":-71.9405},{"lat":-13.537127,"lng":-71.943732},{"lat":-13.54,"lng":-71.944913},{"lat":-13.542738,"lng":-71.94358},{"lat":-13.543258,"lng":-71.9405},{"lat":-13.542973,"lng":-71.937156}]'::jsonb WHERE codigo = 'ZW-09';

-- --- Trazado + puntos de recojo con lat/lng para las 3 rutas semilla -------
UPDATE rutas SET
  trazado = '[{"lat":-13.5185,"lng":-71.9635},{"lat":-13.520,"lng":-71.962},{"lat":-13.5215,"lng":-71.960},{"lat":-13.523,"lng":-71.958},{"lat":-13.5245,"lng":-71.9565}]'::jsonb,
  puntos = '[{"orden":1,"direccion":"Av. Los Incas cuadra 1","lat":-13.519,"lng":-71.963,"completado":true},
             {"orden":2,"direccion":"Plaza Túpac Amaru","lat":-13.5205,"lng":-71.961,"completado":true},
             {"orden":3,"direccion":"Jr. Manco Cápac","lat":-13.522,"lng":-71.959,"completado":false},
             {"orden":4,"direccion":"Av. Huáscar","lat":-13.524,"lng":-71.957,"completado":false}]'::jsonb
WHERE nombre = 'Ruta Centro Wanchaq - Matutina';

UPDATE rutas SET
  trazado = '[{"lat":-13.5185,"lng":-71.9535},{"lat":-13.520,"lng":-71.951},{"lat":-13.522,"lng":-71.9495},{"lat":-13.524,"lng":-71.9475}]'::jsonb,
  puntos = '[{"orden":1,"direccion":"Urb. Manuel Prado A-1","lat":-13.519,"lng":-71.953,"completado":true},
             {"orden":2,"direccion":"Urb. Manuel Prado B-3","lat":-13.5215,"lng":-71.950,"completado":false},
             {"orden":3,"direccion":"Av. La Cultura tramo Wanchaq","lat":-13.5235,"lng":-71.9475,"completado":false}]'::jsonb
WHERE nombre = 'Ruta Manuel Prado - Matutina';

UPDATE rutas SET
  trazado = '[{"lat":-13.537,"lng":-71.943},{"lat":-13.539,"lng":-71.940},{"lat":-13.5415,"lng":-71.9375}]'::jsonb,
  puntos = '[{"orden":1,"direccion":"Av. Independencia cuadra 2","lat":-13.538,"lng":-71.942,"completado":false},
             {"orden":2,"direccion":"Jr. Tres de Mayo","lat":-13.5405,"lng":-71.938,"completado":false}]'::jsonb
WHERE nombre = 'Ruta Independencia - Matutina';
