-- Eliminar de daily_stock_cards
DELETE FROM daily_stock_cards WHERE user_id = 1040;

-- Eliminar de user_card_inventory (si existe/se usa para stock)
DELETE FROM user_card_inventory WHERE user_id = 1040;

-- Mensaje de confirmacion
SELECT 'Limpieza de cartones para Eve27 (1040) completada' as result;
