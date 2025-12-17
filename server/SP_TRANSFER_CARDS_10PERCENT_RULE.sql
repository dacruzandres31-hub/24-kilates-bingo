-- ========================================
-- MIGRACIÓN: Actualizar sp_transfer_cards con regla del 10%
-- Fecha: 2025-12-13
-- Descripción: Al transferir cartones, máximo 10% pueden ser gratis
-- ========================================

USE bingo_24k;

-- Eliminar procedimiento anterior
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
  DECLARE v_paid_available INT DEFAULT 0;
  DECLARE v_free_available INT DEFAULT 0;
  DECLARE v_total_available INT DEFAULT 0;
  
  -- Distribución según regla 10%
  DECLARE v_max_free INT DEFAULT 0;
  DECLARE v_actual_free INT DEFAULT 0;
  DECLARE v_need_paid INT DEFAULT 0;
  
  -- Variables para loop de descuento
  DECLARE v_paid_to_deduct INT DEFAULT 0;
  DECLARE v_free_to_deduct INT DEFAULT 0;
  DECLARE v_record_id INT;
  DECLARE v_record_quantity INT;
  DECLARE v_deduct_from_this INT;
  DECLARE done INT DEFAULT FALSE;
  
  -- ========================================
  -- PASO 1: Verificar disponibilidad por tipo
  -- ========================================
  SELECT 
    COALESCE(SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END), 0)
  INTO v_paid_available, v_free_available
  FROM user_card_inventory
  WHERE user_id = p_from_user_id AND room = p_room;
  
  SET v_total_available = v_paid_available + v_free_available;
  
  -- Validar que hay suficientes cartones en total
  IF v_total_available < p_quantity THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Cartones insuficientes para transferir';
  END IF;
  
  -- ========================================
  -- PASO 2: Calcular distribución con regla 10%
  -- MODO FLEXIBLE: Si no hay suficientes pagos, usar todos los disponibles
  -- ========================================
  -- Máximo 10% pueden ser gratis (redondeado hacia arriba)
  SET v_max_free = CEIL(p_quantity * 0.10);
  SET v_actual_free = LEAST(v_max_free, v_free_available);
  SET v_need_paid = p_quantity - v_actual_free;
  
  -- MODO FLEXIBLE: Si no hay suficientes pagos, usar todos los disponibles
  IF v_need_paid > v_paid_available THEN
    -- Usar TODOS los pagos disponibles
    SET v_need_paid = v_paid_available;
    SET v_actual_free = p_quantity - v_need_paid;
    
    -- Verificar que haya suficientes gratis para completar
    IF v_actual_free > v_free_available THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'Cartones insuficientes para transferir (modo flexible activado)';
    END IF;
  END IF;
  
  -- ========================================
  -- PASO 3: Descontar tickets PAGOS del origen
  -- ========================================
  SET v_paid_to_deduct = v_need_paid;
  
  BEGIN
    DECLARE cur_paid CURSOR FOR 
      SELECT id, quantity 
      FROM user_card_inventory
      WHERE user_id = p_from_user_id AND room = p_room AND is_gift = 0 AND quantity > 0
      ORDER BY created_at ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur_paid;
    
    paid_loop: LOOP
      FETCH cur_paid INTO v_record_id, v_record_quantity;
      
      IF done OR v_paid_to_deduct = 0 THEN
        LEAVE paid_loop;
      END IF;
      
      SET v_deduct_from_this = LEAST(v_paid_to_deduct, v_record_quantity);
      
      -- Deducir del origen
      UPDATE user_card_inventory
      SET quantity = quantity - v_deduct_from_this
      WHERE id = v_record_id;
      
      -- Acreditar al destino
      INSERT INTO user_card_inventory (user_id, room, is_gift, quantity)
      VALUES (p_to_user_id, p_room, 0, v_deduct_from_this)
      ON DUPLICATE KEY UPDATE quantity = quantity + v_deduct_from_this;
      
      -- Log salida
      INSERT INTO card_movements_log 
      (user_id, room, movement_type, quantity, is_gift, to_user_id, executed_by, reason)
      VALUES (p_from_user_id, p_room, 'transfer_out', v_deduct_from_this, 0, p_to_user_id, p_executed_by, 'Transferencia PAGOS (regla 10%)');
      
      -- Log entrada
      INSERT INTO card_movements_log 
      (user_id, room, movement_type, quantity, is_gift, from_user_id, executed_by, reason)
      VALUES (p_to_user_id, p_room, 'transfer_in', v_deduct_from_this, 0, p_from_user_id, p_executed_by, 'Recepción PAGOS (regla 10%)');
      
      SET v_paid_to_deduct = v_paid_to_deduct - v_deduct_from_this;
    END LOOP;
    
    CLOSE cur_paid;
  END;
  
  -- ========================================
  -- PASO 4: Descontar tickets GRATIS del origen (solo si v_actual_free > 0)
  -- ========================================
  IF v_actual_free > 0 THEN
    SET v_free_to_deduct = v_actual_free;
    SET done = FALSE;
    
    BEGIN
      DECLARE cur_free CURSOR FOR 
        SELECT id, quantity 
        FROM user_card_inventory
        WHERE user_id = p_from_user_id AND room = p_room AND is_gift = 1 AND quantity > 0
        ORDER BY created_at ASC;
      
      DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
      
      OPEN cur_free;
      
      free_loop: LOOP
        FETCH cur_free INTO v_record_id, v_record_quantity;
        
        IF done OR v_free_to_deduct = 0 THEN
          LEAVE free_loop;
        END IF;
        
        SET v_deduct_from_this = LEAST(v_free_to_deduct, v_record_quantity);
        
        -- Deducir del origen
        UPDATE user_card_inventory
        SET quantity = quantity - v_deduct_from_this
        WHERE id = v_record_id;
        
        -- Acreditar al destino
        INSERT INTO user_card_inventory (user_id, room, is_gift, quantity)
        VALUES (p_to_user_id, p_room, 1, v_deduct_from_this)
        ON DUPLICATE KEY UPDATE quantity = quantity + v_deduct_from_this;
        
        -- Log salida
        INSERT INTO card_movements_log 
        (user_id, room, movement_type, quantity, is_gift, to_user_id, executed_by, reason)
        VALUES (p_from_user_id, p_room, 'transfer_out', v_deduct_from_this, 1, p_to_user_id, p_executed_by, 'Transferencia GRATIS (regla 10%)');
        
        -- Log entrada
        INSERT INTO card_movements_log 
        (user_id, room, movement_type, quantity, is_gift, from_user_id, executed_by, reason)
        VALUES (p_to_user_id, p_room, 'transfer_in', v_deduct_from_this, 1, p_from_user_id, p_executed_by, 'Recepción GRATIS (regla 10%)');
        
        SET v_free_to_deduct = v_free_to_deduct - v_deduct_from_this;
      END LOOP;
      
      CLOSE cur_free;
    END;
  END IF;
  
  -- ========================================
  -- PASO 5: Limpiar registros con cantidad 0
  -- ========================================
  DELETE FROM user_card_inventory 
  WHERE quantity = 0;
  
END$$

DELIMITER ;

-- ========================================
-- Verificación
-- ========================================
SELECT 'Stored procedure sp_transfer_cards actualizado con regla 10% gratis' AS status;
