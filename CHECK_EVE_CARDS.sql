SELECT vc.id, vc.player_id, vc.game_session_id, gs.status AS session_status, gs.room 
FROM validated_cards vc 
JOIN game_sessions gs ON vc.game_session_id = gs.id 
WHERE vc.player_id = 1040;
