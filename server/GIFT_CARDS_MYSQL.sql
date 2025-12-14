-- Migración Gift Cards para MySQL
-- Fecha: 13-DIC-2025

-- Agregar columnas de cartones de regalo a users
ALTER TABLE users 
ADD COLUMN gift_cards_bronce INT DEFAULT 0 NOT NULL,
ADD COLUMN gift_cards_plata INT DEFAULT 0 NOT NULL,
ADD COLUMN gift_cards_oro INT DEFAULT 0 NOT NULL;

-- Crear índices
CREATE INDEX idx_gift_cards_bronce ON users(gift_cards_bronce);
CREATE INDEX idx_gift_cards_plata ON users(gift_cards_plata);
CREATE INDEX idx_gift_cards_oro ON users(gift_cards_oro);

-- Modificar game_cards
ALTER TABLE game_cards
ADD COLUMN is_gift BOOLEAN DEFAULT FALSE;

-- Crear tabla de movimientos
CREATE TABLE gift_cards_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  admin_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  quantity INT NOT NULL,
  movement_type ENUM('add', 'remove', 'used') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_movements (user_id, created_at),
  INDEX idx_admin_movements (admin_id, created_at),
  INDEX idx_room (room)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
