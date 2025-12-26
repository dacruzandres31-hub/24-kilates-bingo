-- Crear tabla card_inventory para gestionar inventario de cartones
-- Incluye soporte para cartones regulares y cartones de regalo (is_gift)

CREATE TABLE IF NOT EXISTS card_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  is_gift TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Regalo (no afecta pozos), 0 = Normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_user_room (user_id, room),
  INDEX idx_user_gift (user_id, is_gift),
  
  -- Clave foránea
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Restricción: No puede haber cantidad negativa
  CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentario de la tabla
ALTER TABLE card_inventory COMMENT = 'Inventario de cartones por usuario y sala. is_gift=1 indica cartones de regalo que no afectan pozos';
