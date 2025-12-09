-- ===================================================
-- MIGRACIÓN: CONTADOR GLOBAL DE CARTONES
-- ===================================================
-- Versión: 1.4.0
-- Fecha: 2025-12-08
-- Propósito: Garantizar seriales únicos globalmente
-- ===================================================

-- Tabla de contador global
CREATE TABLE IF NOT EXISTS global_card_counter (
  id INT PRIMARY KEY DEFAULT 1,
  counter BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (id = 1) -- Solo permite una fila
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar fila única inicial
INSERT INTO global_card_counter (id, counter) 
VALUES (1, 0)
ON DUPLICATE KEY UPDATE counter = counter;

-- Agregar constraint UNIQUE en card_pool.serial
ALTER TABLE card_pool 
ADD UNIQUE KEY idx_serial_unique (serial);

-- Índice compuesto para búsquedas rápidas
CREATE INDEX idx_card_pool_session_serial ON card_pool(session_id, serial);

-- Verificación
SELECT * FROM global_card_counter;
