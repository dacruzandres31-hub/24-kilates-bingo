-- Script de Restauración de Cartones Validados
-- Mover validated_cards de la sesión "colgada" a la sesión nueva activa

-- 1. Identificar sesión activa y sesión vieja
SET @active_session_id = (SELECT id FROM game_sessions WHERE status = 'active' AND room = 'bronce' ORDER BY created_at DESC LIMIT 1);
SET @old_session_id = (
    SELECT id FROM game_sessions 
    WHERE status = 'completed' 
    AND total_paid_cards > 0 
    ORDER BY updated_at DESC LIMIT 1
);

-- 2. Migrar validated_cards
UPDATE validated_cards 
SET game_session_id = @active_session_id 
WHERE game_session_id = @old_session_id;

-- 3. Recalcular contadores nuevamente
UPDATE game_sessions gs
JOIN room_settings rs ON gs.room COLLATE utf8mb4_unicode_ci = rs.room COLLATE utf8mb4_unicode_ci
SET 
    gs.jackpot_pre40 = IFNULL(gs.jackpot_pre40, rs.accumulated_pot_pre40),
    gs.total_paid_cards = (SELECT COUNT(*) FROM validated_cards WHERE game_session_id = gs.id AND is_gift = 0),
    gs.total_gift_cards = (SELECT COUNT(*) FROM validated_cards WHERE game_session_id = gs.id AND is_gift = 1),
    gs.jackpot_linea = IFNULL(gs.jackpot_linea, (SELECT COUNT(*) FROM validated_cards WHERE game_session_id = gs.id AND is_gift = 0) * rs.card_price * 0.15),
    gs.jackpot_bingo = IFNULL(gs.jackpot_bingo, (SELECT COUNT(*) FROM validated_cards WHERE game_session_id = gs.id AND is_gift = 0) * rs.card_price * 0.50)
WHERE gs.id = @active_session_id;
