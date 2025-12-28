-- Arreglar estadísticas usando la tabla correcta (validated_cards) y sin escribir en columnas inexistentes
-- 1. Recalcular contadores usando validated_cards (Tabla real de ventas)
--    Y calcular Jackpots basados en las ventas reales * precio de la sala
UPDATE game_sessions gs
JOIN room_settings rs ON gs.room COLLATE utf8mb4_unicode_ci = rs.room COLLATE utf8mb4_unicode_ci
SET 
    gs.jackpot_pre40 = IFNULL(gs.jackpot_pre40, rs.accumulated_pot_pre40),
    gs.total_paid_cards = (SELECT COUNT(*) FROM validated_cards WHERE game_session_id = gs.id AND is_gift = 0),
    gs.total_gift_cards = (SELECT COUNT(*) FROM validated_cards WHERE game_session_id = gs.id AND is_gift = 1),
    gs.jackpot_linea = IFNULL(gs.jackpot_linea, (SELECT COUNT(*) FROM validated_cards WHERE game_session_id = gs.id AND is_gift = 0) * rs.card_price * 0.15),
    gs.jackpot_bingo = IFNULL(gs.jackpot_bingo, (SELECT COUNT(*) FROM validated_cards WHERE game_session_id = gs.id AND is_gift = 0) * rs.card_price * 0.50)
WHERE gs.status = 'active';
