-- ============================================
-- MIGRACIÓN: DATOS DE PAGO DE GANADORES
-- ============================================
-- Tabla para almacenar información bancaria de ganadores
-- Se completa cuando un jugador gana en salas monetizadas

CREATE TABLE IF NOT EXISTS winners_payment_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Relación con el premio/ganancia
  user_id INT NOT NULL,
  game_session_id INT NULL,
  prize_type ENUM('linea', 'bingo', 'carton_lleno') NOT NULL,
  prize_amount DECIMAL(15, 2) NOT NULL,
  sala_type ENUM('bronce', 'plata', 'oro') NOT NULL,
  
  -- Datos bancarios del ganador
  bank_account_holder VARCHAR(255) NOT NULL COMMENT 'Titular de la cuenta',
  cbu VARCHAR(22) NOT NULL COMMENT 'CBU de 22 dígitos',
  bank_name VARCHAR(255) NULL COMMENT 'Nombre del banco (opcional)',
  account_type ENUM('savings', 'checking', 'other') DEFAULT 'savings',
  
  -- Datos de contacto
  whatsapp_number VARCHAR(20) NOT NULL COMMENT 'Número de WhatsApp para enviar comprobante',
  
  -- Estado del pago
  payment_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  payment_date TIMESTAMP NULL,
  payment_receipt VARCHAR(500) NULL COMMENT 'URL o código del comprobante',
  processed_by INT NULL COMMENT 'ID del admin/cajero que procesó',
  
  -- Metadata
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  
  -- Índices y llaves
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_payment (user_id, payment_status),
  INDEX idx_session (game_session_id),
  INDEX idx_payment_status (payment_status),
  INDEX idx_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRIGGER: Registrar automáticamente cuando ganan
-- ============================================
-- Este trigger se puede usar opcionalmente para crear el registro automáticamente
-- cuando se registra un ganador en otra tabla

DELIMITER //

CREATE TRIGGER after_winner_insert
AFTER INSERT ON game_winners
FOR EACH ROW
BEGIN
  DECLARE sala_monetizada VARCHAR(10);
  
  -- Obtener tipo de sala
  SELECT sala_type INTO sala_monetizada
  FROM game_sessions
  WHERE id = NEW.game_session_id;
  
  -- Solo crear registro si es sala monetizada
  IF sala_monetizada IN ('bronce', 'plata', 'oro') THEN
    INSERT INTO winners_payment_info (
      user_id,
      game_session_id,
      prize_type,
      prize_amount,
      sala_type,
      bank_account_holder,
      cbu,
      whatsapp_number,
      payment_status
    ) VALUES (
      NEW.user_id,
      NEW.game_session_id,
      NEW.prize_type,
      NEW.prize_amount,
      sala_monetizada,
      'PENDIENTE',
      '0000000000000000000000',
      'PENDIENTE',
      'pending'
    );
  END IF;
END//

DELIMITER ;

-- ============================================
-- VISTA: Ganadores pendientes de pago
-- ============================================
CREATE OR REPLACE VIEW v_winners_pending_payment AS
SELECT 
  wpi.*,
  u.username,
  u.balance as user_balance,
  gs.room_name,
  gs.finished_at as game_finished_at,
  TIMESTAMPDIFF(HOUR, wpi.submitted_at, NOW()) as hours_since_submission
FROM winners_payment_info wpi
JOIN users u ON wpi.user_id = u.id
LEFT JOIN game_sessions gs ON wpi.game_session_id = gs.id
WHERE wpi.payment_status = 'pending'
  AND wpi.bank_account_holder != 'PENDIENTE'
ORDER BY wpi.submitted_at ASC;

-- ============================================
-- VISTA: Historial de pagos a ganadores
-- ============================================
CREATE OR REPLACE VIEW v_winners_payment_history AS
SELECT 
  wpi.*,
  u.username as winner_username,
  processor.username as processor_username,
  gs.room_name,
  TIMESTAMPDIFF(DAY, wpi.submitted_at, wpi.payment_date) as days_to_process
FROM winners_payment_info wpi
JOIN users u ON wpi.user_id = u.id
LEFT JOIN users processor ON wpi.processed_by = processor.id
LEFT JOIN game_sessions gs ON wpi.game_session_id = gs.id
WHERE wpi.payment_status IN ('completed', 'failed')
ORDER BY wpi.payment_date DESC;

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver ganadores que aún no completaron sus datos
-- SELECT * FROM winners_payment_info 
-- WHERE bank_account_holder = 'PENDIENTE' 
-- AND payment_status = 'pending';

-- Ver ganadores por sala
-- SELECT sala_type, COUNT(*) as total_winners, SUM(prize_amount) as total_prizes
-- FROM winners_payment_info
-- GROUP BY sala_type;

-- Ver ganadores pendientes de pago por usuario
-- SELECT user_id, username, COUNT(*) as pending_prizes, SUM(prize_amount) as total_pending
-- FROM v_winners_pending_payment
-- GROUP BY user_id, username;
