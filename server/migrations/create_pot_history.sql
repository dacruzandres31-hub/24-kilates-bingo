-- Tabla para historial de cambios en pozos
-- Registra cada actualización de pozos para análisis y gráficos

CREATE TABLE IF NOT EXISTS pot_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  room VARCHAR(20) NOT NULL,
  
  -- Valores de pozos después del cambio
  jackpot_linea DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  jackpot_bingo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  jackpot_pre40 DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  
  -- Incrementos
  linea_increment DECIMAL(10,2) DEFAULT 0.00,
  bingo_increment DECIMAL(10,2) DEFAULT 0.00,
  pre40_increment DECIMAL(10,2) DEFAULT 0.00,
  
  -- Información del cambio
  change_type ENUM('card_selection', 'prize_awarded', 'reset', 'manual') NOT NULL,
  player_id INT NULL COMMENT 'Jugador que causó el cambio (si aplica)',
  cards_added INT DEFAULT 0 COMMENT 'Cantidad de cartones agregados',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_session (session_id),
  INDEX idx_room (room),
  INDEX idx_created (created_at),
  INDEX idx_room_date (room, created_at),
  INDEX idx_room_date_type (room, created_at, change_type),
  
  FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
