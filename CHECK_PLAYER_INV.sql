SELECT u.id, u.username, u.role, uci.room, uci.quantity 
FROM users u 
LEFT JOIN user_card_inventory uci ON u.id = uci.user_id 
WHERE u.role = 'jugador' 
ORDER BY u.created_at DESC 
LIMIT 5;
