SELECT id, username FROM users WHERE username = 'Eve27';
SELECT COUNT(*) as card_count, room, status FROM daily_stock_cards 
WHERE user_id = (SELECT id FROM users WHERE username = 'Eve27')
GROUP BY room, status;
