-- ============================================
-- MIGRACIÓN: SISTEMA DE GESTIÓN DE FICHAS
-- ============================================
-- Tabla para rastrear TODOS los movimientos de fichas
-- con auditoría completa y balance antes/después

USE bingo_24k;

-- Crear tabla de movimientos de fichas
CREATE TABLE IF NOT EXISTS chips_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Usuario relacionado
  user_id INT NOT NULL,
  
  -- Tipo de movimiento
  movement_type ENUM(
    'deposit',       -- Depósito manual (admin/cajero)
    'withdrawal',    -- Retiro manual (admin/cajero)
    'bet',           -- Apuesta en juego
    'win',           -- Premio ganado
    'refund',        -- Reembolso
    'transfer_in',   -- Transferencia recibida
    'transfer_out',  -- Transferencia enviada
    'adjustment',    -- Ajuste administrativo
    'bonus',         -- Bonificación
    'penalty'        -- Penalización
  ) NOT NULL,
  
  -- Cantidad (positivo o negativo)
  amount DECIMAL(15, 2) NOT NULL,
  
  -- Balance antes y después (para auditoría)
  balance_before DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2) NOT NULL,
  
  -- Relaciones opcionales
  admin_id INT NULL,              -- Admin que ejecutó la acción
  game_session_id INT NULL,       -- Sesión de juego relacionada
  related_user_id INT NULL,       -- Usuario relacionado (transferencias)
  
  -- Motivo del movimiento
  reason VARCHAR(500) NOT NULL,
  
  -- Metadata adicional (JSON)
  metadata JSON NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para consultas rápidas
  INDEX idx_user_id (user_id),
  INDEX idx_movement_type (movement_type),
  INDEX idx_created_at (created_at),
  INDEX idx_admin_id (admin_id),
  INDEX idx_game_session (game_session_id),
  INDEX idx_user_date (user_id, created_at),
  
  -- Relaciones
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VERIFICACIONES DE INTEGRIDAD
-- ============================================

-- Verificar que todos los usuarios tengan balance >= 0
ALTER TABLE users 
ADD CONSTRAINT chk_balance_positive 
CHECK (balance >= 0);

-- ============================================
-- TRIGGERS PARA VALIDACIÓN AUTOMÁTICA
-- ============================================

DELIMITER //

-- Trigger: Validar que balance_after = balance_before + amount
CREATE TRIGGER validate_movement_balance
BEFORE INSERT ON chips_movements
FOR EACH ROW
BEGIN
  DECLARE calculated_balance DECIMAL(15, 2);
  SET calculated_balance = NEW.balance_before + NEW.amount;
  
  IF ABS(calculated_balance - NEW.balance_after) > 0.01 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Balance inconsistente: balance_after no coincide con balance_before + amount';
  END IF;
END//

DELIMITER ;

-- ============================================
-- VISTAS ÚTILES PARA REPORTES
-- ============================================

-- Vista: Resumen de movimientos por usuario
CREATE OR REPLACE VIEW v_user_movements_summary AS
SELECT 
  u.id as user_id,
  u.username,
  u.balance as current_balance,
  COUNT(cm.id) as total_movements,
  SUM(CASE WHEN cm.amount > 0 THEN cm.amount ELSE 0 END) as total_deposits,
  SUM(CASE WHEN cm.amount < 0 THEN ABS(cm.amount) ELSE 0 END) as total_withdrawals,
  MAX(cm.created_at) as last_movement_date
FROM users u
LEFT JOIN chips_movements cm ON u.id = cm.user_id
GROUP BY u.id, u.username, u.balance;

-- Vista: Movimientos recientes (últimas 24 horas)
CREATE OR REPLACE VIEW v_recent_movements AS
SELECT 
  cm.*,
  u.username,
  u_admin.username as admin_username
FROM chips_movements cm
JOIN users u ON cm.user_id = u.id
LEFT JOIN users u_admin ON cm.admin_id = u_admin.id
WHERE cm.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY cm.created_at DESC;

-- Vista: Movimientos de alto valor (> 1000 fichas)
CREATE OR REPLACE VIEW v_high_value_movements AS
SELECT 
  cm.*,
  u.username,
  u_admin.username as admin_username
FROM chips_movements cm
JOIN users u ON cm.user_id = u.id
LEFT JOIN users u_admin ON cm.admin_id = u_admin.id
WHERE ABS(cm.amount) >= 1000
ORDER BY cm.created_at DESC;

-- ============================================
-- PROCEDIMIENTO: AUDITORÍA DE BALANCE
-- ============================================

DELIMITER //

CREATE PROCEDURE audit_all_balances()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_user_id INT;
  DECLARE v_current_balance DECIMAL(15, 2);
  DECLARE v_calculated_balance DECIMAL(15, 2);
  DECLARE v_discrepancy DECIMAL(15, 2);
  
  DECLARE user_cursor CURSOR FOR 
    SELECT id, balance FROM users;
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  -- Tabla temporal para resultados
  CREATE TEMPORARY TABLE IF NOT EXISTS audit_results (
    user_id INT,
    current_balance DECIMAL(15, 2),
    calculated_balance DECIMAL(15, 2),
    discrepancy DECIMAL(15, 2),
    is_valid BOOLEAN
  );
  
  OPEN user_cursor;
  
  read_loop: LOOP
    FETCH user_cursor INTO v_user_id, v_current_balance;
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    -- Calcular balance basado en movimientos
    SELECT COALESCE(SUM(amount), 0) INTO v_calculated_balance
    FROM chips_movements
    WHERE user_id = v_user_id;
    
    SET v_discrepancy = v_current_balance - v_calculated_balance;
    
    INSERT INTO audit_results VALUES (
      v_user_id,
      v_current_balance,
      v_calculated_balance,
      v_discrepancy,
      ABS(v_discrepancy) < 0.01
    );
  END LOOP;
  
  CLOSE user_cursor;
  
  -- Mostrar resultados
  SELECT * FROM audit_results WHERE is_valid = FALSE;
  
  DROP TEMPORARY TABLE IF EXISTS audit_results;
END//

DELIMITER ;

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL - SOLO DESARROLLO)
-- ============================================

-- Descomentar para insertar datos de prueba
/*
-- Ejemplo: Depósito manual
INSERT INTO chips_movements 
(user_id, movement_type, amount, balance_before, balance_after, admin_id, reason, metadata)
VALUES 
(1, 'deposit', 1000.00, 0.00, 1000.00, 2, 'Depósito inicial', '{"method": "cash"}');

-- Ejemplo: Apuesta
INSERT INTO chips_movements 
(user_id, movement_type, amount, balance_before, balance_after, game_session_id, reason, metadata)
VALUES 
(1, 'bet', -50.00, 1000.00, 950.00, 1, 'Apuesta en juego #1', '{"card_cost": 50}');

-- Ejemplo: Premio
INSERT INTO chips_movements 
(user_id, movement_type, amount, balance_before, balance_after, game_session_id, reason, metadata)
VALUES 
(1, 'win', 200.00, 950.00, 1150.00, 1, 'Premio BINGO', '{"pattern": "full_card"}');
*/

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Contar movimientos por tipo
SELECT 
  movement_type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM chips_movements
GROUP BY movement_type;

-- Verificar integridad de balances
CALL audit_all_balances();

SELECT 'Migración de sistema de fichas completada exitosamente' as status;
