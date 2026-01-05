-- Crear tabla bingo_cards_pool con estructura correcta
CREATE TABLE IF NOT EXISTS bingo_cards_pool (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_serial VARCHAR(50) NOT NULL,
  room VARCHAR(20) NOT NULL,
  numbers JSON NOT NULL,
  grid_data JSON NULL,
  status ENUM('available', 'reserved', 'used', 'sold', 'discarded') DEFAULT 'available',
  reserved_by INT NULL,
  reserved_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_room (room),
  INDEX idx_status (status),
  INDEX idx_card_serial (card_serial),
  INDEX idx_room_status (room, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recrear player_card_selections
CREATE TABLE IF NOT EXISTS player_card_selections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id VARCHAR(50) NOT NULL,
  card_id INT NOT NULL,
  selected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_session (user_id, session_id),
  INDEX idx_card (card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Tables recreated successfully' as resultado;
