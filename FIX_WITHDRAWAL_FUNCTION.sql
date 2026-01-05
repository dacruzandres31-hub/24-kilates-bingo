-- Fix para función faltante en producción
-- Ejecutar en MySQL bingo_24k

DROP FUNCTION IF EXISTS can_process_withdrawal_time_rule;
DROP FUNCTION IF EXISTS get_minutes_since_last_credit;

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
    RETURN 9999;
  END IF;
  
  SET minutes_elapsed = TIMESTAMPDIFF(MINUTE, last_credit_time, NOW());
  
  RETURN minutes_elapsed;
END//

DELIMITER ;

SELECT 'Funciones creadas correctamente' AS resultado;
