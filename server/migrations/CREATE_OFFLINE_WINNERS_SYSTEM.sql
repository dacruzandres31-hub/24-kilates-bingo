-- ============================================
-- MIGRACIÓN: Sistema de Verificación de Ganadores Offline
-- ============================================
-- Permite que jugadores ganen premios aunque no estén conectados
-- El sistema verifica todos los cartones en cada bolilla
-- ============================================

USE bingo_24k;

-- ========================================
-- 1. Crear tabla game_winners
-- ========================================

CREATE TABLE IF NOT EXISTS game_winners (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  user_id INT NOT NULL,
  card_id INT NOT NULL,
  prize_type ENUM('linea', 'bingo', 'pre40') NOT NULL,
  ball_number INT NOT NULL COMMENT 'Bolilla en la que ganó',
  balls_drawn JSON NOT NULL COMMENT 'Array de bolillas salidas hasta ese momento',
  prize_amount DECIMAL(10,2) NOT NULL,
  share_count INT DEFAULT 1 COMMENT 'Cantidad de ganadores con los que se dividió',
  notified BOOLEAN DEFAULT FALSE,
  balance_credited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP NULL,
  
  INDEX idx_session (session_id),
  INDEX idx_user (user_id),
  INDEX idx_notified (notified),
  INDEX idx_balance_credited (balance_credited),
  
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 2. Modificar tabla player_card_selections
-- ========================================

-- Verificar si las columnas ya existen antes de agregarlas
SET @dbname = DATABASE();
SET @tablename = 'player_card_selections';

-- Agregar columna line_won si no existe
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'line_won'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE player_card_selections ADD COLUMN line_won BOOLEAN DEFAULT FALSE COMMENT "Indica si este cartón ganó línea"',
  'SELECT "Column line_won already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar columna bingo_won si no existe
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'bingo_won'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE player_card_selections ADD COLUMN bingo_won BOOLEAN DEFAULT FALSE COMMENT "Indica si este cartón ganó bingo"',
  'SELECT "Column bingo_won already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar columna line_ball_number si no existe
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'line_ball_number'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE player_card_selections ADD COLUMN line_ball_number INT NULL COMMENT "Bolilla en la que ganó línea"',
  'SELECT "Column line_ball_number already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar columna bingo_ball_number si no existe
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND COLUMN_NAME = 'bingo_ball_number'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE player_card_selections ADD COLUMN bingo_ball_number INT NULL COMMENT "Bolilla en la que ganó bingo"',
  'SELECT "Column bingo_ball_number already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- 3. Agregar índices para optimizar consultas
-- ========================================

-- Índice para buscar cartones ganadores de línea
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND INDEX_NAME = 'idx_line_won'
);

SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE player_card_selections ADD INDEX idx_line_won (line_won)',
  'SELECT "Index idx_line_won already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Índice para buscar cartones ganadores de bingo
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND INDEX_NAME = 'idx_bingo_won'
);

SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE player_card_selections ADD INDEX idx_bingo_won (bingo_won)',
  'SELECT "Index idx_bingo_won already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- Verificación
-- ========================================

-- Mostrar estructura de game_winners
SELECT 
  'Estructura de game_winners' AS descripcion,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'bingo_24k'
AND TABLE_NAME = 'game_winners'
ORDER BY ORDINAL_POSITION;

-- Mostrar nuevas columnas de player_card_selections
SELECT 
  'Nuevas columnas en player_card_selections' AS descripcion,
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'bingo_24k'
AND TABLE_NAME = 'player_card_selections'
AND COLUMN_NAME IN ('line_won', 'bingo_won', 'line_ball_number', 'bingo_ball_number')
ORDER BY ORDINAL_POSITION;

SELECT '✅ Migración completada exitosamente' AS status;
