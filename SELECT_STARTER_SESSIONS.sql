SELECT id, room, status, play_date, start_time, selection_close_time, is_preventa 
FROM game_sessions 
WHERE room IN ('starter', 'free_starter') 
ORDER BY id DESC 
LIMIT 10;
