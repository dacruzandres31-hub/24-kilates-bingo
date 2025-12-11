-- Crear tabla para gestión de cartones por usuario
CREATE TABLE IF NOT EXISTS user_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_room (user_id, room)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
