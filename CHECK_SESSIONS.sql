SELECT id, room, status, card_price, jackpot_linea, jackpot_bingo, jackpot_pre40 
FROM game_sessions 
WHERE status = 'active' OR status = 'pending' 
ORDER BY id DESC LIMIT 5;
