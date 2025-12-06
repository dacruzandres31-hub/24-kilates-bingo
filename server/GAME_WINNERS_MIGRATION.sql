-- ============================================
-- TABLAS PARA SISTEMA DE JUEGO Y GANADORES
-- ============================================

-- Tabla: game_winners (registrar ganadores de cada partida)
CREATE TABLE IF NOT EXISTS game_winners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_session_id INT NOT NULL,
  user_id INT NOT NULL,
  card_id INT NOT NULL,
  prize_type ENUM('linea', 'bingo') NOT NULL,
  prize_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  line_type VARCHAR(20) NULL COMMENT 'horizontal, vertical, diagonal, four_corners',
  winning_numbers JSON NULL COMMENT 'Array de números que conforman la línea/bingo ganador',
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified BOOLEAN DEFAULT FALSE,
  notes TEXT NULL,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES bingo_cards(id) ON DELETE CASCADE,
  INDEX idx_game_session (game_session_id),
  INDEX idx_user (user_id),
  INDEX idx_prize_type (prize_type),
  INDEX idx_claimed_at (claimed_at),
  UNIQUE KEY uk_user_card_prize (game_session_id, user_id, card_id, prize_type, line_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Registro de ganadores de líneas y bingos por sesión';

-- Tabla: game_session_balls (números cantados en cada sesión)
CREATE TABLE IF NOT EXISTS game_session_balls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_session_id INT NOT NULL,
  ball_number INT NOT NULL COMMENT 'Número del 1 al 75',
  ball_letter CHAR(1) NOT NULL COMMENT 'B, I, N, G, O',
  draw_order INT NOT NULL COMMENT 'Orden de extracción',
  drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
  INDEX idx_session (game_session_id),
  INDEX idx_draw_order (game_session_id, draw_order),
  UNIQUE KEY uk_session_ball (game_session_id, ball_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Números extraídos en cada sesión de juego';

-- Vista: v_game_winners_detailed
CREATE OR REPLACE VIEW v_game_winners_detailed AS
SELECT 
  gw.id,
  gw.game_session_id,
  gs.room_id,
  gs.session_number,
  gs.status AS session_status,
  gw.user_id,
  u.username,
  u.email,
  gw.card_id,
  gw.prize_type,
  gw.prize_amount,
  gw.line_type,
  gw.winning_numbers,
  gw.claimed_at,
  gw.verified,
  -- Verificar si ya completó datos de pago
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM winner_payment_info wpi 
      WHERE wpi.user_id = gw.user_id 
        AND wpi.game_session_id = gw.game_session_id 
        AND wpi.prize_type = gw.prize_type
    ) THEN TRUE
    ELSE FALSE
  END AS payment_form_submitted,
  -- Estado del pago si existe
  (SELECT payment_status FROM winner_payment_info wpi 
   WHERE wpi.user_id = gw.user_id 
     AND wpi.game_session_id = gw.game_session_id 
     AND wpi.prize_type = gw.prize_type
   LIMIT 1) AS payment_status
FROM game_winners gw
JOIN users u ON gw.user_id = u.id
LEFT JOIN game_sessions gs ON gw.game_session_id = gs.id;

-- Vista: v_session_winners_summary (resumen de ganadores por sesión)
CREATE OR REPLACE VIEW v_session_winners_summary AS
SELECT 
  gs.id AS game_session_id,
  gs.room_id,
  gs.session_number,
  gs.status,
  gs.created_at AS session_start,
  gs.updated_at AS session_end,
  COUNT(DISTINCT gw.user_id) AS total_winners,
  COUNT(CASE WHEN gw.prize_type = 'linea' THEN 1 END) AS total_lines,
  COUNT(CASE WHEN gw.prize_type = 'bingo' THEN 1 END) AS total_bingos,
  SUM(gw.prize_amount) AS total_prizes_paid,
  -- Contar cuántos tienen datos de pago completos
  COUNT(CASE 
    WHEN EXISTS (
      SELECT 1 FROM winner_payment_info wpi 
      WHERE wpi.user_id = gw.user_id 
        AND wpi.game_session_id = gw.game_session_id 
        AND wpi.prize_type = gw.prize_type
    ) THEN 1 
  END) AS winners_with_payment_data
FROM game_sessions gs
LEFT JOIN game_winners gw ON gs.id = gw.game_session_id
GROUP BY gs.id, gs.room_id, gs.session_number, gs.status, gs.created_at, gs.updated_at;

-- Trigger: Validar que el número de bola esté en rango correcto
DELIMITER $$

CREATE TRIGGER validate_ball_number
BEFORE INSERT ON game_session_balls
FOR EACH ROW
BEGIN
  DECLARE valid_range BOOLEAN DEFAULT FALSE;
  
  -- Validar según la letra
  CASE NEW.ball_letter
    WHEN 'B' THEN
      IF NEW.ball_number BETWEEN 1 AND 15 THEN SET valid_range = TRUE; END IF;
    WHEN 'I' THEN
      IF NEW.ball_number BETWEEN 16 AND 30 THEN SET valid_range = TRUE; END IF;
    WHEN 'N' THEN
      IF NEW.ball_number BETWEEN 31 AND 45 THEN SET valid_range = TRUE; END IF;
    WHEN 'G' THEN
      IF NEW.ball_number BETWEEN 46 AND 60 THEN SET valid_range = TRUE; END IF;
    WHEN 'O' THEN
      IF NEW.ball_number BETWEEN 61 AND 75 THEN SET valid_range = TRUE; END IF;
  END CASE;
  
  IF NOT valid_range THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Número de bola no corresponde a su letra (B:1-15, I:16-30, N:31-45, G:46-60, O:61-75)';
  END IF;
END$$

DELIMITER ;

-- Índices adicionales para optimizar consultas
CREATE INDEX idx_session_status ON game_sessions(status, room_id);
CREATE INDEX idx_card_session ON bingo_cards(game_session_id, user_id);
CREATE INDEX idx_winner_verification ON game_winners(game_session_id, verified);
