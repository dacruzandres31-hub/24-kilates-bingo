-- ============================================
-- MIGRACIÓN: SISTEMA DE SOLICITUDES DE RETIRO
-- ============================================
-- Sistema de retiros con verificación de CBU/cuenta bancaria
-- Regla de 20 minutos: cajero < 20min, superadmin siempre

USE bingo_24k;

-- ============================================
-- TABLA: SOLICITUDES DE RETIRO
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Usuario que solicita el retiro
  user_id INT NOT NULL,
  
  -- Monto a retirar
  amount DECIMAL(15, 2) NOT NULL,
  
  -- Datos bancarios
  bank_account_holder VARCHAR(255) NOT NULL, -- Nombre del titular
  cbu VARCHAR(22) NOT NULL,                  -- CBU argentino (22 dígitos)
  bank_name VARCHAR(255) NULL,               -- Nombre del banco (opcional)
  account_type ENUM('savings', 'checking', 'other') DEFAULT 'savings',
  
  -- Estado de la solicitud
  status ENUM(
    'pending',      -- Esperando procesamiento
    'processing',   -- En proceso de transferencia
    'completed',    -- Retiro completado y fichas debitadas
    'rejected',     -- Rechazado por admin
    'cancelled'     -- Cancelado por usuario
  ) NOT NULL DEFAULT 'pending',
  
  -- Timestamps críticos para regla de 20 minutos
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  
  -- Quién procesó el retiro
  processed_by INT NULL,                     -- Admin/cajero que procesó
  processor_role ENUM('cajero', 'superadmin') NULL,
  
  -- Referencia al movimiento de fichas
  chips_movement_id INT NULL,                -- FK a chips_movements
  
  -- Metadata adicional
  rejection_reason VARCHAR(500) NULL,
  transfer_receipt VARCHAR(255) NULL,        -- URL del comprobante de transferencia
  metadata JSON NULL,
  
  -- Índices
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_requested_at (requested_at),
  INDEX idx_processed_by (processed_by),
  INDEX idx_user_status (user_id, status),
  
  -- Relaciones
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (chips_movement_id) REFERENCES chips_movements(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT chk_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_cbu_format CHECK (LENGTH(cbu) = 22)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AGREGAR ROLES A TABLA USERS (si no existe)
-- ============================================
-- Verificar si la columna 'role' existe antes de agregarla

SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'bingo_24k' 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'role'
);

SET @query = IF(
  @col_exists = 0,
  'ALTER TABLE users ADD COLUMN role ENUM(''player'', ''cajero'', ''admin'', ''superadmin'') NOT NULL DEFAULT ''player''',
  'SELECT "Column role already exists" as message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- FUNCIÓN: VERIFICAR REGLA DE 20 MINUTOS
-- ============================================
DELIMITER //

CREATE FUNCTION can_process_withdrawal_time_rule(
  p_user_id INT,
  p_amount DECIMAL(15, 2),
  p_processor_role ENUM('cajero', 'superadmin')
) RETURNS BOOLEAN
DETERMINISTIC
BEGIN
  DECLARE last_credit_time TIMESTAMP;
  DECLARE minutes_elapsed INT;
  
  -- Si es superadmin, siempre puede procesar
  IF p_processor_role = 'superadmin' THEN
    RETURN TRUE;
  END IF;
  
  -- Obtener la última acreditación de fichas (deposit o win)
  SELECT MAX(created_at) INTO last_credit_time
  FROM chips_movements
  WHERE user_id = p_user_id
    AND movement_type IN ('deposit', 'win', 'bonus', 'transfer_in')
    AND amount > 0;
  
  -- Si no hay acreditaciones, no permitir retiro
  IF last_credit_time IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calcular minutos transcurridos
  SET minutes_elapsed = TIMESTAMPDIFF(MINUTE, last_credit_time, NOW());
  
  -- Cajero solo puede procesar si pasaron MENOS de 20 minutos
  IF p_processor_role = 'cajero' AND minutes_elapsed < 20 THEN
    RETURN TRUE;
  END IF;
  
  -- Si pasaron 20+ minutos, cajero NO puede procesar
  RETURN FALSE;
END//

DELIMITER ;

-- ============================================
-- FUNCIÓN: OBTENER TIEMPO DESDE ÚLTIMA ACREDITACIÓN
-- ============================================
DELIMITER //

CREATE FUNCTION get_minutes_since_last_credit(p_user_id INT) 
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE last_credit_time TIMESTAMP;
  DECLARE minutes_elapsed INT;
  
  SELECT MAX(created_at) INTO last_credit_time
  FROM chips_movements
  WHERE user_id = p_user_id
    AND movement_type IN ('deposit', 'win', 'bonus', 'transfer_in')
    AND amount > 0;
  
  IF last_credit_time IS NULL THEN
    RETURN 9999; -- Valor alto si no hay acreditaciones
  END IF;
  
  SET minutes_elapsed = TIMESTAMPDIFF(MINUTE, last_credit_time, NOW());
  
  RETURN minutes_elapsed;
END//

DELIMITER ;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Solicitudes de retiro pendientes
CREATE OR REPLACE VIEW v_pending_withdrawals AS
SELECT 
  wr.*,
  u.username,
  u.email,
  u.balance,
  get_minutes_since_last_credit(wr.user_id) as minutes_since_credit,
  CASE 
    WHEN get_minutes_since_last_credit(wr.user_id) < 20 THEN 'cajero_can_process'
    ELSE 'superadmin_only'
  END as processing_permission
FROM withdrawal_requests wr
JOIN users u ON wr.user_id = u.id
WHERE wr.status = 'pending'
ORDER BY wr.requested_at ASC;

-- Vista: Historial de retiros completados
CREATE OR REPLACE VIEW v_completed_withdrawals AS
SELECT 
  wr.*,
  u.username,
  u_processor.username as processor_username,
  TIMESTAMPDIFF(MINUTE, wr.requested_at, wr.completed_at) as processing_time_minutes
FROM withdrawal_requests wr
JOIN users u ON wr.user_id = u.id
LEFT JOIN users u_processor ON wr.processed_by = u_processor.id
WHERE wr.status = 'completed'
ORDER BY wr.completed_at DESC;

-- Vista: Retiros rechazados
CREATE OR REPLACE VIEW v_rejected_withdrawals AS
SELECT 
  wr.*,
  u.username,
  u_processor.username as rejected_by_username
FROM withdrawal_requests wr
JOIN users u ON wr.user_id = u.id
LEFT JOIN users u_processor ON wr.processed_by = u_processor.id
WHERE wr.status = 'rejected'
ORDER BY wr.processed_at DESC;

-- ============================================
-- TRIGGER: VALIDAR BALANCE ANTES DE SOLICITUD
-- ============================================
DELIMITER //

CREATE TRIGGER validate_withdrawal_balance
BEFORE INSERT ON withdrawal_requests
FOR EACH ROW
BEGIN
  DECLARE user_balance DECIMAL(15, 2);
  
  -- Obtener balance del usuario
  SELECT balance INTO user_balance
  FROM users
  WHERE id = NEW.user_id;
  
  -- Verificar que tenga fondos suficientes
  IF user_balance < NEW.amount THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Fondos insuficientes para solicitar retiro';
  END IF;
  
  -- Verificar monto mínimo (ejemplo: 100 fichas)
  IF NEW.amount < 100 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'El monto mínimo de retiro es 100 fichas';
  END IF;
END//

DELIMITER ;

-- ============================================
-- PROCEDIMIENTO: PROCESAR RETIRO COMPLETO
-- ============================================
DELIMITER //

CREATE PROCEDURE process_withdrawal_complete(
  IN p_withdrawal_id INT,
  IN p_processor_id INT,
  IN p_processor_role ENUM('cajero', 'superadmin'),
  IN p_transfer_receipt VARCHAR(255)
)
BEGIN
  DECLARE v_user_id INT;
  DECLARE v_amount DECIMAL(15, 2);
  DECLARE v_can_process BOOLEAN;
  DECLARE v_minutes_elapsed INT;
  DECLARE v_chips_movement_id INT;
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- Obtener datos de la solicitud
  SELECT user_id, amount INTO v_user_id, v_amount
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id AND status = 'pending';
  
  IF v_user_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Solicitud de retiro no encontrada o ya procesada';
  END IF;
  
  -- Verificar regla de 20 minutos
  SET v_can_process = can_process_withdrawal_time_rule(v_user_id, v_amount, p_processor_role);
  SET v_minutes_elapsed = get_minutes_since_last_credit(v_user_id);
  
  IF NOT v_can_process THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = CONCAT(
      'No tiene permisos para procesar este retiro. ',
      'Han pasado ', v_minutes_elapsed, ' minutos desde la última acreditación. ',
      'Solo un superadmin puede procesar retiros después de 20 minutos.'
    );
  END IF;
  
  -- Actualizar estado de solicitud
  UPDATE withdrawal_requests
  SET 
    status = 'completed',
    processed_at = NOW(),
    completed_at = NOW(),
    processed_by = p_processor_id,
    processor_role = p_processor_role,
    transfer_receipt = p_transfer_receipt
  WHERE id = p_withdrawal_id;
  
  -- Registrar movimiento de fichas (débito)
  INSERT INTO chips_movements (
    user_id, movement_type, amount, balance_before, balance_after,
    admin_id, reason, metadata
  )
  SELECT 
    v_user_id,
    'withdrawal',
    -v_amount,
    balance,
    balance - v_amount,
    p_processor_id,
    CONCAT('Retiro procesado - CBU: ', (SELECT cbu FROM withdrawal_requests WHERE id = p_withdrawal_id)),
    JSON_OBJECT(
      'withdrawal_request_id', p_withdrawal_id,
      'processor_role', p_processor_role,
      'minutes_since_credit', v_minutes_elapsed
    )
  FROM users
  WHERE id = v_user_id;
  
  SET v_chips_movement_id = LAST_INSERT_ID();
  
  -- Actualizar referencia al movimiento
  UPDATE withdrawal_requests
  SET chips_movement_id = v_chips_movement_id
  WHERE id = p_withdrawal_id;
  
  -- Debitar fichas del usuario
  UPDATE users
  SET balance = balance - v_amount
  WHERE id = v_user_id;
  
  COMMIT;
  
  SELECT 
    'success' as status,
    p_withdrawal_id as withdrawal_id,
    v_chips_movement_id as chips_movement_id,
    v_minutes_elapsed as minutes_since_credit;
END//

DELIMITER ;

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL - SOLO DESARROLLO)
-- ============================================

/*
-- Crear usuarios de prueba con roles
UPDATE users SET role = 'superadmin' WHERE id = 1;
UPDATE users SET role = 'cajero' WHERE id = 2;
UPDATE users SET role = 'player' WHERE id = 3;

-- Ejemplo: Solicitud de retiro
INSERT INTO withdrawal_requests 
(user_id, amount, bank_account_holder, cbu, bank_name, account_type)
VALUES 
(3, 5000.00, 'Juan Pérez', '0170099520000012345678', 'Banco Nación', 'savings');
*/

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

SELECT 'Migración de sistema de retiros completada exitosamente' as status;

-- Verificar funciones creadas
SHOW FUNCTION STATUS WHERE Db = 'bingo_24k';

-- Verificar vistas creadas
SHOW FULL TABLES WHERE Table_type = 'VIEW';
