-- Trigger: Validar que el número de bola esté en rango correcto (90 BALL UPDATE)
DROP TRIGGER IF EXISTS validate_ball_number;

DELIMITER $$

CREATE TRIGGER validate_ball_number
BEFORE INSERT ON game_session_balls
FOR EACH ROW
BEGIN
  DECLARE valid_range BOOLEAN DEFAULT FALSE;
  
  -- Validar según la letra (Reglas 90 Bolas)
  CASE NEW.ball_letter
    WHEN 'B' THEN
      IF NEW.ball_number BETWEEN 1 AND 18 THEN SET valid_range = TRUE; END IF;
    WHEN 'I' THEN
      IF NEW.ball_number BETWEEN 19 AND 36 THEN SET valid_range = TRUE; END IF;
    WHEN 'N' THEN
      IF NEW.ball_number BETWEEN 37 AND 54 THEN SET valid_range = TRUE; END IF;
    WHEN 'G' THEN
      IF NEW.ball_number BETWEEN 55 AND 72 THEN SET valid_range = TRUE; END IF;
    WHEN 'O' THEN
      IF NEW.ball_number BETWEEN 73 AND 90 THEN SET valid_range = TRUE; END IF;
  END CASE;
  
  IF NOT valid_range THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Número de bola no corresponde a su letra para Bingo 90 (B:1-18, I:19-36, N:37-54, G:55-72, O:73-90)';
  END IF;
END$$

DELIMITER ;
