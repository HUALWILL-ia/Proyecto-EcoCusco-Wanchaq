-- ============================================================================
-- Migración 006 — Reemplaza los emojis guardados en tipos_residuo.icono por
-- nombres de íconos de Phosphor (https://phosphoricons.com), consistente con
-- el resto del frontend (que dejó de usar emojis como íconos).
--
-- Segura de ejecutar sobre una base de datos "eccoCusco" que YA existe y
-- tiene datos: solo actualiza las 4 filas semilla identificadas por nombre.
--
-- Cómo aplicarla:
--   psql -U postgres -h localhost -d eccoCusco -f migraciones/006_iconos_phosphor_tipos_residuo.sql
-- ============================================================================

UPDATE tipos_residuo SET icono = 'leaf'     WHERE nombre = 'Orgánico';
UPDATE tipos_residuo SET icono = 'recycle'  WHERE nombre = 'Reciclable';
UPDATE tipos_residuo SET icono = 'trash'    WHERE nombre = 'Mixto / No aprovechable';
UPDATE tipos_residuo SET icono = 'armchair' WHERE nombre = 'Voluminoso / Especial';
