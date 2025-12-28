SELECT id, room, status, play_date, start_time, total_cards_validated 
FROM game_sessions 
ORDER BY id DESC 
LIMIT 10;
