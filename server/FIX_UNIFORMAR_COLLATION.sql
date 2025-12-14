-- FIX DEFINITIVO: Uniformar TODAS las columnas room a utf8mb4_unicode_ci

-- 1. daily_stock_cards
ALTER TABLE daily_stock_cards 
MODIFY COLUMN room VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL;

-- 2. game_sessions
ALTER TABLE game_sessions 
MODIFY COLUMN room VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL;

-- Verificación final
SELECT 'TODAS LAS TABLAS UNIFORMADAS' AS status;
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLLATION_NAME 
FROM information_schema.columns 
WHERE TABLE_SCHEMA = 'bingo_24k' 
  AND COLUMN_NAME = 'room' 
  AND TABLE_NAME NOT LIKE 'v_%'
ORDER BY TABLE_NAME;
