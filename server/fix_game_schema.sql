-- ============================================
-- CORRECCIONES Y ACTUALIZACIONES DE ESQUEMA
-- ============================================

-- 1. Agregar columna room_id a game_sessions si no existe
ALTER TABLE game_sessions 
ADD COLUMN room_id INT NULL AFTER id,
ADD INDEX idx_room_id (room_id);

-- 2. Agregar columna game_session_id a bingo_cards si no existe  
ALTER TABLE bingo_cards 
ADD COLUMN game_session_id INT NULL AFTER session_id,
ADD INDEX idx_game_session_id (game_session_id);

-- 3. Agregar columna numbers a bingo_cards (formato estándar 5x5)
ALTER TABLE bingo_cards 
ADD COLUMN numbers JSON NULL COMMENT 'Matriz 5x5 de números del cartón';

-- 4. Vista corregida: v_game_winners_detailed
CREATE OR REPLACE VIEW v_game_winners_detailed AS
SELECT 
  gw.id,
  gw.game_session_id,
  gs.room,
  gs.status AS session_status,
  gw.user_id,
  u.username,
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

-- 5. Vista corregida: v_session_winners_summary
CREATE OR REPLACE VIEW v_session_winners_summary AS
SELECT 
  gs.id AS game_session_id,
  gs.room,
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
GROUP BY gs.id, gs.room, gs.status, gs.created_at, gs.updated_at;
