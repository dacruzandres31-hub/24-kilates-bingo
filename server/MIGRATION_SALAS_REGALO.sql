-- ========================================
-- MIGRACIÓN: Salas de Regalo
-- Fecha: 2025-12-11
-- Descripción: Agregar columnas para cartones de regalo
--              (bronce_regalo, plata_regalo, oro_regalo)
-- ========================================

USE bingo_24k;

-- Agregar columnas de salas de regalo a user_cards
ALTER TABLE user_cards
ADD COLUMN IF NOT EXISTS cards_bronce_regalo INT DEFAULT 0 AFTER cards_bronce,
ADD COLUMN IF NOT EXISTS cards_plata_regalo INT DEFAULT 0 AFTER cards_plata,
ADD COLUMN IF NOT EXISTS cards_oro_regalo INT DEFAULT 0 AFTER cards_oro;

-- Verificar estructura
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'bingo_24k' 
  AND TABLE_NAME = 'user_cards'
ORDER BY ORDINAL_POSITION;

-- Verificar que daily_stock_cards acepta las nuevas salas
-- (el campo 'room' es VARCHAR(50), suficiente para 'bronce_regalo')
SELECT DISTINCT room 
FROM daily_stock_cards 
ORDER BY room;

SELECT '✅ Migración completada: Salas de Regalo agregadas' AS status;
