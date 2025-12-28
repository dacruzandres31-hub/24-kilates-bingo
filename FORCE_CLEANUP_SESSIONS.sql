UPDATE game_sessions SET status = 'completed' WHERE status IN ('active', 'playing');
