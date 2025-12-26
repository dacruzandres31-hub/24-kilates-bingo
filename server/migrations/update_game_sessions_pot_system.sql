-- Modificaciones al schema para sistema de pozos de salas pagas
-- Agrega campos necesarios para cierre de selección y tracking de pozos

-- 1. Agregar campos a game_sessions
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS card_selection_closed BOOLEAN DEFAULT FALSE COMMENT 'Indica si la selección de cartones está cerrada (2 min antes del sorteo)',
ADD COLUMN IF NOT EXISTS selection_close_time TIMESTAMP NULL COMMENT 'Timestamp cuando se cerró la selección';

-- 2. Verificar que accumulated_pot existe (para Pre-40 Jackpot)
-- Si no existe, agregarlo
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS accumulated_pot DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Pozo Pre-40 acumulativo (se gana si bingo sale antes de bolilla 40)';

-- 3. Agregar índices para mejorar performance
ALTER TABLE game_sessions ADD INDEX idx_card_selection (card_selection_closed, status);
ALTER TABLE game_sessions ADD INDEX idx_accumulated_pot (accumulated_pot);

-- 4. Comentarios de las columnas existentes
ALTER TABLE game_sessions 
MODIFY COLUMN current_pot_linea DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Pozo actual de Línea (15% de cartones pagos)',
MODIFY COLUMN current_pot_bingo DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Pozo actual de Bingo (50% de cartones pagos)';

-- Verificar estructura
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'game_sessions'
  AND COLUMN_NAME IN ('card_selection_closed', 'selection_close_time', 'accumulated_pot', 'current_pot_linea', 'current_pot_bingo')
ORDER BY ORDINAL_POSITION;
