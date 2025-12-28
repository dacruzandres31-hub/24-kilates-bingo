SELECT 'POOL' as source, id, serial, selected_at, room, status, game_session_id FROM bingo_cards_pool WHERE selected_by = 1040 ORDER BY selected_at DESC LIMIT 5;

SELECT 'VALIDATED' as source, id, card_serial, created_at, room, game_session_id FROM validated_cards WHERE player_id = 1040 ORDER BY created_at DESC LIMIT 5;

SELECT id, status, room FROM game_sessions WHERE room = 'bronce' ORDER BY id DESC LIMIT 2;
