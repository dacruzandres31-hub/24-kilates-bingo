-- ==============================================================================
-- TABLA: starter_room_config
-- Configuración de premios para la Sala Starter (premios en tickets)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS starter_room_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prizes_linea INT DEFAULT 2,           -- Cantidad de tickets para premio de Línea
  prizes_bingo INT DEFAULT 5,           -- Cantidad de tickets para premio de Bingo
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuración inicial
INSERT INTO starter_room_config (prizes_linea, prizes_bingo) 
VALUES (2, 5)
ON DUPLICATE KEY UPDATE
  prizes_linea = VALUES(prizes_linea),
  prizes_bingo = VALUES(prizes_bingo);

-- ==============================================================================
-- ENDPOINT SUPPORT: Vista para obtener configuración actual
-- ==============================================================================
CREATE OR REPLACE VIEW v_starter_config AS
SELECT 
  src.id,
  src.prizes_linea,
  src.prizes_bingo,
  src.updated_by,
  src.updated_at,
  processor.username AS updated_by_name
FROM starter_room_config src
LEFT JOIN users processor ON src.updated_by = processor.id
ORDER BY src.id DESC
LIMIT 1;

SELECT 'Tabla starter_room_config creada exitosamente' AS resultado;
