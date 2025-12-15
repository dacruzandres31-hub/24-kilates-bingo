-- Migración: Sistema de cartones pre-generados para las salas
-- Cada sala tiene un pool de cartones únicos que los jugadores pueden seleccionar

CREATE TABLE IF NOT EXISTS bingo_cards_pool (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_serial VARCHAR(50) UNIQUE NOT NULL,
  room ENUM('starter', 'bronce', 'plata', 'oro') NOT NULL,
  numbers JSON NOT NULL COMMENT 'Matriz 3x9 del cartón',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('available', 'selected', 'used') DEFAULT 'available',
  selected_by INT NULL COMMENT 'ID del usuario que seleccionó el cartón',
  selected_at TIMESTAMP NULL,
  game_session_id INT NULL COMMENT 'ID de la sesión en la que se usó',
  
  INDEX idx_room_status (room, status),
  INDEX idx_serial (card_serial),
  INDEX idx_selected_by (selected_by),
  
  CONSTRAINT fk_selected_user FOREIGN KEY (selected_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Pool de cartones pre-generados para cada sala';

-- Crear índice compuesto para búsquedas rápidas
CREATE INDEX idx_room_available ON bingo_cards_pool(room, status, id);
