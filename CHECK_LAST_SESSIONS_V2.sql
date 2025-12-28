SELECT id, room, status, start_time, total_cards_validated 
FROM game_sessions 
ORDER BY id DESC 
LIMIT 10;
