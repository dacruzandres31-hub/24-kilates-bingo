-- =====================================================
-- MIGRACIÓN: Tabla de Historial de Sesiones Finalizadas
-- =====================================================
-- Registra el detalle completo de cada sorteo:
-- - Ganadores de LÍNEA y BINGO
-- - Cartones participantes
-- - Bolilla en que salió LÍNEA
-- - Bolilla en que salió BINGO
-- - Secuencia completa de bolillas

CREATE TABLE IF NOT EXISTS session_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_session_id INT NOT NULL,
  room ENUM('starter', 'bronce', 'plata', 'oro') NOT NULL,
  
  -- Fecha y hora del sorteo
  draw_date DATE NOT NULL,
  draw_time TIME NOT NULL,
  
  -- Ganadores
  winner_linea_user_id INT DEFAULT NULL,
  winner_linea_username VARCHAR(50) DEFAULT NULL,
  winner_bingo_user_id INT DEFAULT NULL,
  winner_bingo_username VARCHAR(50) DEFAULT NULL,
  
  -- Bolillas ganadoras
  linea_ball_number TINYINT DEFAULT NULL COMMENT 'Número de bolilla en que salió LÍNEA (1-75)',
  linea_ball_index TINYINT DEFAULT NULL COMMENT 'Posición en secuencia (ej: bolilla 15 fue la 30ava)',
  bingo_ball_number TINYINT DEFAULT NULL COMMENT 'Número de bolilla en que salió BINGO (1-75)',
  bingo_ball_index TINYINT DEFAULT NULL COMMENT 'Posición en secuencia (ej: bolilla 42 fue la 55ava)',
  
  -- Secuencia de bolillas (JSON array)
  ball_sequence JSON COMMENT 'Array ordenado de bolillas: [12, 45, 3, ...]',
  
  -- Participantes (JSON array de objetos)
  participating_cards JSON COMMENT 'Array de {card_id, user_id, username, payment_type}',
  
  -- Premios otorgados
  prize_linea DECIMAL(15,2) DEFAULT 0,
  prize_bingo DECIMAL(15,2) DEFAULT 0,
  prize_jackpot DECIMAL(15,2) DEFAULT 0,
  
  -- Estadísticas
  total_cards INT DEFAULT 0,
  total_paid_cards INT DEFAULT 0,
  total_gift_cards INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_session (game_session_id),
  INDEX idx_room_date (room, draw_date),
  INDEX idx_draw_date (draw_date),
  
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (winner_linea_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_bingo_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Agregar columnas a game_sessions (ignorar si existen)
-- =====================================================

-- Procedimiento para agregar columnas solo si no existen
DELIMITER $$

CREATE PROCEDURE add_session_history_columns()
BEGIN
  -- linea_ball_number
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = 'bingo_24k' 
                 AND TABLE_NAME = 'game_sessions' 
                 AND COLUMN_NAME = 'linea_ball_number') THEN
    ALTER TABLE game_sessions ADD COLUMN linea_ball_number TINYINT DEFAULT NULL;
  END IF;
  
  -- linea_ball_index
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = 'bingo_24k' 
                 AND TABLE_NAME = 'game_sessions' 
                 AND COLUMN_NAME = 'linea_ball_index') THEN
    ALTER TABLE game_sessions ADD COLUMN linea_ball_index TINYINT DEFAULT NULL;
  END IF;
  
  -- bingo_ball_number
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = 'bingo_24k' 
                 AND TABLE_NAME = 'game_sessions' 
                 AND COLUMN_NAME = 'bingo_ball_number') THEN
    ALTER TABLE game_sessions ADD COLUMN bingo_ball_number TINYINT DEFAULT NULL;
  END IF;
  
  -- bingo_ball_index
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = 'bingo_24k' 
                 AND TABLE_NAME = 'game_sessions' 
                 AND COLUMN_NAME = 'bingo_ball_index') THEN
    ALTER TABLE game_sessions ADD COLUMN bingo_ball_index TINYINT DEFAULT NULL;
  END IF;
  
  -- ball_sequence
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = 'bingo_24k' 
                 AND TABLE_NAME = 'game_sessions' 
                 AND COLUMN_NAME = 'ball_sequence') THEN
    ALTER TABLE game_sessions ADD COLUMN ball_sequence JSON;
  END IF;
  
  -- archived
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = 'bingo_24k' 
                 AND TABLE_NAME = 'game_sessions' 
                 AND COLUMN_NAME = 'archived') THEN
    ALTER TABLE game_sessions ADD COLUMN archived TINYINT(1) DEFAULT 0;
  END IF;
END$$

DELIMITER ;

-- Ejecutar el procedimiento
CALL add_session_history_columns();

-- Eliminar el procedimiento
DROP PROCEDURE add_session_history_columns;
