-- ============================================
-- TABLA: INFORMACIÓN DE PAGO DE GANADORES
-- ============================================

CREATE TABLE IF NOT EXISTS winner_payment_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  game_session_id INT NULL,
  prize_type ENUM('linea', 'bingo') NOT NULL,
  prize_amount DECIMAL(15,2) NOT NULL,
  
  -- Datos bancarios
  cbu VARCHAR(22) NOT NULL,
  bank_account_holder VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NULL,
  account_type ENUM('savings', 'checking', 'other') DEFAULT 'savings',
  
  -- Datos de contacto
  whatsapp VARCHAR(20) NOT NULL,
  
  -- Estado del pago
  payment_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  payment_receipt VARCHAR(500) NULL,
  payment_date TIMESTAMP NULL,
  processed_by INT NULL,
  
  -- Metadata
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_user_id (user_id),
  INDEX idx_game_session_id (game_session_id),
  INDEX idx_payment_status (payment_status),
  INDEX idx_created_at (created_at),
  
  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
  -- game_session_id FK se agregará después cuando exista la tabla
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VISTA: PAGOS PENDIENTES
-- ============================================
CREATE OR REPLACE VIEW v_pending_winner_payments AS
SELECT 
  wpi.*,
  u.username,
  u.role,
  processor.username as processor_username
FROM winner_payment_info wpi
JOIN users u ON wpi.user_id = u.id
LEFT JOIN users processor ON wpi.processed_by = processor.id
WHERE wpi.payment_status = 'pending'
ORDER BY wpi.created_at ASC;

-- ============================================
-- VISTA: HISTORIAL DE PAGOS COMPLETADOS
-- ============================================
CREATE OR REPLACE VIEW v_completed_winner_payments AS
SELECT 
  wpi.*,
  u.username,
  processor.username as processor_username,
  TIMESTAMPDIFF(HOUR, wpi.created_at, wpi.payment_date) as hours_to_complete
FROM winner_payment_info wpi
JOIN users u ON wpi.user_id = u.id
LEFT JOIN users processor ON wpi.processed_by = processor.id
WHERE wpi.payment_status = 'completed'
ORDER BY wpi.payment_date DESC;

-- ============================================
-- TRIGGER: VALIDAR CBU
-- ============================================
DELIMITER //

CREATE TRIGGER validate_winner_cbu
BEFORE INSERT ON winner_payment_info
FOR EACH ROW
BEGIN
  IF LENGTH(NEW.cbu) != 22 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'CBU debe tener exactamente 22 dígitos';
  END IF;
  
  IF NEW.whatsapp NOT REGEXP '^[0-9+]{10,20}$' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Formato de WhatsApp inválido';
  END IF;
END//

DELIMITER ;

-- ============================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_winner_payment_composite ON winner_payment_info(payment_status, created_at);
CREATE INDEX idx_winner_payment_user_status ON winner_payment_info(user_id, payment_status);
