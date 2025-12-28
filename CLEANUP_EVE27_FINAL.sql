-- DEFINITIVE CLEANUP FOR EVE27 (UserId 1040)
DELETE FROM user_cards WHERE user_id = 1040;
DELETE FROM validated_cards WHERE player_id = 1040;
DELETE FROM player_card_selections WHERE user_id = 1040;
DELETE FROM user_card_inventory WHERE user_id = 1040;
DELETE FROM bingo_cards_pool WHERE selected_by = 1040;
DELETE FROM card_pool WHERE reserved_by = 1040;
DELETE FROM daily_stock_cards WHERE user_id = 1040;
SELECT 'EVE27 CLEANUP COMPLETED' as status;
