-- Migración: Agregar estado 'reserved' a bingo_cards_pool
-- Fecha: 2025-12-16
-- Descripción: Permite reservas temporales de cartones

USE bingo_24k;

-- Modificar columna status para incluir 'reserved'
ALTER TABLE bingo_cards_pool 
MODIFY COLUMN status ENUM('available', 'reserved', 'selected', 'used', 'expired') NOT NULL DEFAULT 'available';

-- Verificar el cambio
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'bingo_24k' 
AND TABLE_NAME = 'bingo_cards_pool' 
AND COLUMN_NAME = 'status';
