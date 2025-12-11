-- ========================================
-- MIGRACIÓN: Sistema de Inventario de Cartones
-- Fecha: 2025-12-11
-- Descripción: Sistema completo de tracking de cartones
--              - Inventario de usuarios (sin número de serie)
--              - Cartones validados para sorteo (con serial)
--              - Tracking de cartones de regalo (invisible para admins)
-- ========================================

USE bingo_24k;

-- ========================================
-- 1. TABLA: user_card_inventory
-- Cartones en inventario del usuario (SIN número de serie)
-- Duran indefinidamente hasta que se validan en sala
-- ========================================

CREATE TABLE IF NOT EXISTS user_card_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  is_gift BOOLEAN DEFAULT false COMMENT 'Solo visible para SuperAdmin - No suma a pozos',
  quantity INT DEFAULT 1,
  purchase_price DECIMAL(10,2) NULL COMMENT 'Precio que pagó el usuario al adquirir',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_user_room (user_id, room),
  INDEX idx_gift_status (is_gift),
  INDEX idx_created (created_at),
  
  -- Un usuario puede tener múltiples registros por sala (normal/regalo)
  UNIQUE KEY unique_user_room_gift (user_id, room, is_gift)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Inventario de cartones sin asignar a sorteo - Sin número de serie';


-- ========================================
-- 2. TABLA: validated_cards
-- Cartones validados para un sorteo específico
-- SE GENERA EL NÚMERO DE SERIE AL MOMENTO DE VALIDAR
-- ========================================

CREATE TABLE IF NOT EXISTS validated_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  game_session_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  serial_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'Generado al validar en sala',
  grid_numbers JSON NOT NULL COMMENT 'Grid de bingo [col1, col2, col3, col4, col5]',
  is_gift BOOLEAN DEFAULT false COMMENT 'Interno: Si es regalo NO suma a pozos',
  contributed_amount DECIMAL(10,2) DEFAULT 0 COMMENT 'Monto que aportó a pozos (0 si es regalo)',
  validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  
  INDEX idx_session (game_session_id),
  INDEX idx_player (player_id),
  INDEX idx_room (room),
  INDEX idx_serial (serial_number),
  INDEX idx_gift_tracking (game_session_id, is_gift)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cartones validados para sorteo - CON número de serie asignado';


-- ========================================
-- 3. TABLA: card_movements_log
-- Auditoría de movimientos de cartones
-- ========================================

CREATE TABLE IF NOT EXISTS card_movements_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room ENUM('bronce', 'plata', 'oro') NOT NULL,
  movement_type ENUM('credit', 'debit', 'transfer_in', 'transfer_out', 'validated') NOT NULL,
  quantity INT NOT NULL,
  is_gift BOOLEAN DEFAULT false,
  from_user_id INT NULL COMMENT 'ID del usuario origen (si es transferencia)',
  to_user_id INT NULL COMMENT 'ID del usuario destino (si es transferencia)',
  reason VARCHAR(255) NULL,
  executed_by INT NULL COMMENT 'ID del admin/superadmin que ejecutó',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_user_date (user_id, created_at),
  INDEX idx_movement_type (movement_type),
  INDEX idx_room (room)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Auditoría de todos los movimientos de cartones';


-- ========================================
-- 4. MODIFICAR: game_sessions
-- Agregar tracking de pozos acumulados
-- ========================================

-- Verificar y agregar columnas si no existen
SET @dbname = DATABASE();
SET @tablename = 'game_sessions';

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'jackpot_linea') > 0,
  'SELECT ''jackpot_linea ya existe'' AS status;',
  'ALTER TABLE game_sessions ADD COLUMN jackpot_linea DECIMAL(10,2) DEFAULT 0 COMMENT ''15% de cartones pagos'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'jackpot_bingo') > 0,
  'SELECT ''jackpot_bingo ya existe'' AS status;',
  'ALTER TABLE game_sessions ADD COLUMN jackpot_bingo DECIMAL(10,2) DEFAULT 0 COMMENT ''50% de cartones pagos'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'jackpot_pre40') > 0,
  'SELECT ''jackpot_pre40 ya existe'' AS status;',
  'ALTER TABLE game_sessions ADD COLUMN jackpot_pre40 DECIMAL(10,2) DEFAULT 0 COMMENT ''5% de cartones pagos - Si bingo antes de bola 40'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'total_cards_validated') > 0,
  'SELECT ''total_cards_validated ya existe'' AS status;',
  'ALTER TABLE game_sessions ADD COLUMN total_cards_validated INT DEFAULT 0 COMMENT ''Total de cartones validados'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'total_gift_cards') > 0,
  'SELECT ''total_gift_cards ya existe'' AS status;',
  'ALTER TABLE game_sessions ADD COLUMN total_gift_cards INT DEFAULT 0 COMMENT ''Cartones de regalo validados (no suman)'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'total_paid_cards') > 0,
  'SELECT ''total_paid_cards ya existe'' AS status;',
  'ALTER TABLE game_sessions ADD COLUMN total_paid_cards INT DEFAULT 0 COMMENT ''Cartones pagos validados (suman a pozos)'';'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;


-- ========================================
-- 5. VISTA: Para SuperAdmin - Inventario Detallado
-- ========================================

CREATE OR REPLACE VIEW v_superadmin_inventory AS
SELECT 
  u.id as user_id,
  u.username,
  u.role,
  uci.room,
  SUM(CASE WHEN uci.is_gift = false THEN uci.quantity ELSE 0 END) as normal_cards,
  SUM(CASE WHEN uci.is_gift = true THEN uci.quantity ELSE 0 END) as gift_cards,
  SUM(uci.quantity) as total_cards
FROM users u
LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
GROUP BY u.id, u.username, u.role, uci.room
HAVING total_cards > 0
ORDER BY u.role DESC, u.username, uci.room;


-- ========================================
-- 6. VISTA: Para Admin/Cajero - Inventario Simple (SIN is_gift)
-- ========================================

CREATE OR REPLACE VIEW v_admin_inventory AS
SELECT 
  u.id as user_id,
  u.username,
  u.role,
  uci.room,
  SUM(uci.quantity) as total_cards
FROM users u
LEFT JOIN user_card_inventory uci ON u.id = uci.user_id
GROUP BY u.id, u.username, u.role, uci.room
HAVING total_cards > 0
ORDER BY u.username, uci.room;


-- ========================================
-- 7. STORED PROCEDURE: Transferir Cartones
-- Mantiene proporción de normal/regalo automáticamente
-- ========================================

DELIMITER $$

CREATE PROCEDURE sp_transfer_cards(
  IN p_from_user_id INT,
  IN p_to_user_id INT,
  IN p_room VARCHAR(10),
  IN p_quantity INT,
  IN p_executed_by INT
)
BEGIN
  DECLARE v_remaining INT DEFAULT p_quantity;
  DECLARE v_is_gift BOOLEAN;
  DECLARE v_available INT;
  DECLARE done INT DEFAULT FALSE;
  
  DECLARE cur_cards CURSOR FOR 
    SELECT is_gift, quantity 
    FROM user_card_inventory
    WHERE user_id = p_from_user_id AND room = p_room
    ORDER BY is_gift ASC; -- Primero normales, luego regalo
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  -- Verificar que hay suficientes cartones
  IF (SELECT SUM(quantity) FROM user_card_inventory 
      WHERE user_id = p_from_user_id AND room = p_room) < p_quantity THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cartones insuficientes';
  END IF;
  
  OPEN cur_cards;
  
  transfer_loop: LOOP
    FETCH cur_cards INTO v_is_gift, v_available;
    
    IF done OR v_remaining = 0 THEN
      LEAVE transfer_loop;
    END IF;
    
    SET @to_transfer = LEAST(v_remaining, v_available);
    
    -- Deducir del origen
    UPDATE user_card_inventory
    SET quantity = quantity - @to_transfer
    WHERE user_id = p_from_user_id AND room = p_room AND is_gift = v_is_gift;
    
    -- Acreditar al destino
    INSERT INTO user_card_inventory (user_id, room, is_gift, quantity)
    VALUES (p_to_user_id, p_room, v_is_gift, @to_transfer)
    ON DUPLICATE KEY UPDATE quantity = quantity + @to_transfer;
    
    -- Log salida
    INSERT INTO card_movements_log 
    (user_id, room, movement_type, quantity, is_gift, to_user_id, executed_by, reason)
    VALUES (p_from_user_id, p_room, 'transfer_out', @to_transfer, v_is_gift, p_to_user_id, p_executed_by, 'Transferencia de cartones');
    
    -- Log entrada
    INSERT INTO card_movements_log 
    (user_id, room, movement_type, quantity, is_gift, from_user_id, executed_by, reason)
    VALUES (p_to_user_id, p_room, 'transfer_in', @to_transfer, v_is_gift, p_from_user_id, p_executed_by, 'Recepción de cartones');
    
    SET v_remaining = v_remaining - @to_transfer;
  END LOOP;
  
  CLOSE cur_cards;
  
  -- Limpiar registros con cantidad 0
  DELETE FROM user_card_inventory WHERE quantity = 0;
  
END$$

DELIMITER ;


-- ========================================
-- 8. FUNCIÓN: Calcular porcentaje de regalo en sesión
-- ========================================

DELIMITER $$

CREATE FUNCTION fn_get_gift_percentage(p_session_id INT)
RETURNS DECIMAL(5,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total INT;
  DECLARE v_gift INT;
  DECLARE v_percentage DECIMAL(5,2);
  
  SELECT 
    COUNT(*),
    SUM(CASE WHEN is_gift = true THEN 1 ELSE 0 END)
  INTO v_total, v_gift
  FROM validated_cards
  WHERE game_session_id = p_session_id;
  
  IF v_total = 0 THEN
    RETURN 0;
  END IF;
  
  SET v_percentage = (v_gift / v_total) * 100;
  
  RETURN v_percentage;
END$$

DELIMITER ;


-- ========================================
-- 9. VERIFICACIÓN
-- ========================================

SELECT '✅ Tablas creadas' AS status;

SHOW TABLES LIKE '%card%';

SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'bingo_24k' 
  AND TABLE_NAME IN ('user_card_inventory', 'validated_cards', 'card_movements_log')
ORDER BY TABLE_NAME;

SELECT '✅ Migración completada exitosamente' AS status;
