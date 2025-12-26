-- Unificación del sistema de pozos
-- Usar campos existentes: jackpot_linea, jackpot_bingo, jackpot_pre40
-- Eliminar campos duplicados si existen

-- 1. Verificar si existen los campos nuevos y eliminarlos si no se usan
ALTER TABLE game_sessions DROP COLUMN IF EXISTS current_pot_linea;
ALTER TABLE game_sessions DROP COLUMN IF EXISTS current_pot_bingo;
ALTER TABLE game_sessions DROP COLUMN IF EXISTS accumulated_pot;

-- 2. Asegurar que existen los campos correctos
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS jackpot_linea DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Pozo de Línea (15% de cartones pagos)',
ADD COLUMN IF NOT EXISTS jackpot_bingo DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Pozo de Bingo (50% de cartones pagos)',
ADD COLUMN IF NOT EXISTS jackpot_pre40 DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Pozo Pre-40 acumulativo (5% de cartones pagos)';

-- 3. Mantener campos de control de selección
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS card_selection_closed BOOLEAN DEFAULT FALSE COMMENT 'Indica si la selección de cartones está cerrada',
ADD COLUMN IF NOT EXISTS selection_close_time TIMESTAMP NULL COMMENT 'Timestamp cuando se cerró la selección';

-- 4. Agregar índices
ALTER TABLE game_sessions ADD INDEX IF NOT EXISTS idx_jackpots (jackpot_linea, jackpot_bingo, jackpot_pre40);
ALTER TABLE game_sessions ADD INDEX IF NOT EXISTS idx_card_selection (card_selection_closed, status);

-- Verificar estructura final
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'game_sessions'
  AND (COLUMN_NAME LIKE '%jackpot%' OR COLUMN_NAME LIKE '%pot%' OR COLUMN_NAME LIKE '%selection%')
ORDER BY ORDINAL_POSITION;
