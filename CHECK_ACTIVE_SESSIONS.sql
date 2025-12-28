SELECT id, room, status, play_date, start_time, created_at, updated_at 
FROM game_sessions 
WHERE status NOT IN ('completed', 'cancelled')
ORDER BY created_at DESC 
LIMIT 10;
