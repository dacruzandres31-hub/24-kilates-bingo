SELECT 'Checking SOLD cards' as test, COUNT(*) as count FROM daily_stock_cards WHERE status = 'sold';
SELECT 'Checking PENDING sessions' as test, COUNT(*) as count, GROUP_CONCAT(room) as rooms FROM game_sessions WHERE status = 'pending';
SELECT 'Checking VALIDATED cards' as test, COUNT(*) as count FROM validated_cards;
