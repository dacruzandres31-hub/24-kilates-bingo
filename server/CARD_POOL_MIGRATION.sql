-- ============================================
-- MIGRACIÓN: CARD POOL SYSTEM
-- Tabla para gestionar cartones generados por sesión
-- ============================================

CREATE TABLE IF NOT EXISTS card_pool (
  id VARCHAR(100) PRIMARY KEY,
  session_id VARCHAR(50) NOT NULL,
  serial VARCHAR(20) NOT NULL UNIQUE,
  numbers JSON NOT NULL,
  status ENUM('available', 'reserved', 'used') DEFAULT 'available',
  reserved_by INT NULL,
  reserved_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_session (session_id),
  INDEX idx_status (status),
  INDEX idx_reserved_by (reserved_by),
  INDEX idx_serial (serial),
  
  FOREIGN KEY (reserved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para tracking de reservas de jugadores
CREATE TABLE IF NOT EXISTS player_card_selections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id VARCHAR(50) NOT NULL,
  card_id VARCHAR(100) NOT NULL,
  selected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_session (user_id, session_id),
  INDEX idx_card (card_id),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES card_pool(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_user_card (user_id, card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar columna a game_sessions para tracking de pool
ALTER TABLE game_sessions
ADD COLUMN card_pool_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN total_cards_generated INT DEFAULT 0;

-- Índices adicionales para performance con 500+ jugadores
CREATE INDEX idx_card_pool_session_status ON card_pool(session_id, status);
CREATE INDEX idx_player_selections_session ON player_card_selections(session_id);

DELIMITER $$

-- Trigger para actualizar timestamp de reserva
CREATE TRIGGER before_card_reservation
BEFORE UPDATE ON card_pool
FOR EACH ROW
BEGIN
  IF NEW.status = 'reserved' AND OLD.status != 'reserved' THEN
    SET NEW.reserved_at = NOW();
  END IF;
  
  IF NEW.status = 'available' AND OLD.status = 'reserved' THEN
    SET NEW.reserved_by = NULL;
    SET NEW.reserved_at = NULL;
  END IF;
END$$

DELIMITER ;

-- Comentarios de documentación
ALTER TABLE card_pool COMMENT = 'Pool de cartones generados para cada sesión de juego';
ALTER TABLE player_card_selections COMMENT = 'Registro de selección de cartones por jugador';
