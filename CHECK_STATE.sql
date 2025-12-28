SELECT 'Sold Cards Count' as check_name, COUNT(*) as count FROM daily_stock_cards WHERE status = 'sold';
SELECT 'Pending Sessions' as check_name, id, room, start_time, status FROM game_sessions WHERE status = 'pending';
SELECT 'Active Sessions' as check_name, id, room, start_time, status FROM game_sessions WHERE status = 'active';
