-- Agregar columnas faltantes a chips_movements
ALTER TABLE chips_movements ADD COLUMN reason VARCHAR(255) DEFAULT NULL AFTER reference_id;
ALTER TABLE chips_movements ADD COLUMN metadata JSON DEFAULT NULL AFTER reason;

SELECT 'Columnas reason y metadata agregadas a chips_movements' as resultado;
