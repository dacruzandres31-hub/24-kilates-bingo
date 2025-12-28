SELECT id, room, status, play_date, start_time, total_cards_validated 
FROM game_sessions 
WHERE room IN ('starter', 'free_starter') 
  AND status IN ('active', 'pending', 'playing') 
ORDER BY play_date DESC, start_time DESC;
