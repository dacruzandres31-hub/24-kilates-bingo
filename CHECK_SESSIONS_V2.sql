SELECT id, room, status, jackpot_linea, jackpot_bingo, jackpot_pre40, total_cards_validated 
FROM game_sessions 
WHERE status IN ('active', 'pending') 
ORDER BY id DESC LIMIT 5;
