-- Deep inspection for Eve27 (userId 1040)
SELECT 'user_cards' as tbl, COUNT(*) as qty FROM user_cards WHERE user_id = 1040;
SELECT 'validated_cards' as tbl, COUNT(*) as qty FROM validated_cards WHERE player_id = 1040;
SELECT 'player_card_selections' as tbl, COUNT(*) as qty FROM player_card_selections WHERE user_id = 1040;
SELECT 'bingo_cards_pool' as tbl, COUNT(*) as qty FROM bingo_cards_pool WHERE selected_by = 1040;
SELECT 'card_pool' as tbl, COUNT(*) as qty FROM card_pool WHERE reserved_by = 1040;
SELECT 'user_card_inventory' as tbl, room, quantity, is_gift FROM user_card_inventory WHERE user_id = 1040;
SELECT 'daily_stock_cards' as tbl, COUNT(*) as qty FROM daily_stock_cards WHERE user_id = 1040;
