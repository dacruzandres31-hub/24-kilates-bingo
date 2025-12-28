SELECT 'user_cards' as tablename, COUNT(*) as count FROM user_cards WHERE user_id = 1040;
SELECT 'validated_cards' as tablename, COUNT(*) as count FROM validated_cards WHERE user_id = 1040;
SELECT 'player_card_selections' as tablename, COUNT(*) as count FROM player_card_selections WHERE user_id = 1040;
SELECT 'daily_stock_cards' as tablename, COUNT(*) as count FROM daily_stock_cards WHERE user_id = 1040;
SELECT 'user_card_inventory' as tablename, COUNT(*) as count FROM user_card_inventory WHERE user_id = 1040;
