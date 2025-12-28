SELECT * FROM game_sessions 
WHERE room IN ('starter', 'free_starter') 
  AND status != 'finished'
ORDER BY start_time ASC;
