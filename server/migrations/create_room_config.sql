-- Tabla de configuración de salas
-- Almacena configuración de premios y parámetros por sala

CREATE TABLE IF NOT EXISTS room_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room ENUM('starter', 'bronce', 'plata', 'oro') NOT NULL UNIQUE,
  
  -- Premios específicos para Sala Starter
  line_prize_type ENUM('tickets', 'chips', 'xp', 'achievement') DEFAULT 'tickets',
  line_prize_amount INT DEFAULT 1,
  line_prize_room ENUM('bronce', 'plata', 'oro') DEFAULT 'bronce', -- Para cartones
  
  bingo_prize_type ENUM('tickets', 'chips', 'xp', 'achievement') DEFAULT 'tickets',
  bingo_prize_amount INT DEFAULT 3,
  bingo_prize_room ENUM('bronce', 'plata', 'oro') DEFAULT 'bronce', -- Para cartones
  
  -- Configuración de salas regulares (Bronce/Plata/Oro)
  card_price DECIMAL(10,2) DEFAULT 0,
  pot_percentage_linea INT DEFAULT 30,
  pot_percentage_bingo INT DEFAULT 70,
  
  -- XP multiplier para sala (Starter = 0.1, otras = 1.0)
  xp_multiplier DECIMAL(3,2) DEFAULT 1.00 COMMENT 'Multiplicador de XP (Starter: 0.10, Pagas: 1.00)',
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_room (room)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuración por defecto para todas las salas
INSERT INTO room_config (room, line_prize_type, line_prize_amount, line_prize_room, bingo_prize_type, bingo_prize_amount, bingo_prize_room, card_price, pot_percentage_linea, pot_percentage_bingo, xp_multiplier)
VALUES 
  -- Sala Starter (Gratis)
  ('starter', 'tickets', 1, 'bronce', 'tickets', 3, 'bronce', 0, 0, 0, 0.10),
  
  -- Sala Bronce
  ('bronce', 'tickets', 0, 'bronce', 'tickets', 0, 'bronce', 100, 30, 70, 1.00),
  
  -- Sala Plata
  ('plata', 'tickets', 0, 'plata', 'tickets', 0, 'plata', 200, 30, 70, 1.00),
  
  -- Sala Oro
  ('oro', 'tickets', 0, 'oro', 'tickets', 0, 'oro', 300, 30, 70, 1.00)
ON DUPLICATE KEY UPDATE
  updated_at = CURRENT_TIMESTAMP;

-- Comentario de la tabla
ALTER TABLE room_config COMMENT = 'Configuración de premios y parámetros por sala. Starter tiene premios fijos (cartones regalo), otras salas usan pozos.';
