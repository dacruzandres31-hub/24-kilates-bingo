-- ========================================
-- FIX DEFINITIVO: Collation en user_card_inventory
-- ========================================
-- Cambiar columna room de ENUM a VARCHAR con collation uniforme

-- Paso 1: Cambiar tipo de columna room
ALTER TABLE user_card_inventory 
MODIFY COLUMN room VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL;

-- Paso 2: Recrear stored procedure sin COLLATE (ya no es necesario)
DROP PROCEDURE IF EXISTS sp_transfer_cards;

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
    ORDER BY is_gift ASC;
  
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  -- Verificar suficientes cartones
  IF (SELECT COALESCE(SUM(quantity), 0) FROM user_card_inventory 
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

-- Verificación
SELECT 'FIX APLICADO CORRECTAMENTE' AS status;
SELECT COLUMN_NAME, DATA_TYPE, COLLATION_NAME 
FROM information_schema.columns 
WHERE TABLE_SCHEMA = 'bingo_24k' 
  AND TABLE_NAME = 'user_card_inventory' 
  AND COLUMN_NAME = 'room';
