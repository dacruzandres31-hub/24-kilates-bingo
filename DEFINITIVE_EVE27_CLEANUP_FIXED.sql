-- Definitive cleanup for Eve27 (userId 1040)
DELETE FROM user_cards WHERE user_id = 1040;
DELETE FROM validated_cards WHERE player_id = 1040; -- Corrected column name
DELETE FROM player_card_selections WHERE user_id = 1040;
DELETE FROM daily_stock_cards WHERE user_id = 1040;
DELETE FROM user_card_inventory WHERE user_id = 1040;
DELETE FROM user_inventory WHERE user_id = 1040;
SELECT 'CLEANUP DONE' as status;
