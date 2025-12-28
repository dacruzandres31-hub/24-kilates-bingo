-- FORCE RESET INVENTORY
-- Resetear TODOS los cartones a disponible, sin importar su estado actual.
UPDATE daily_stock_cards 
SET status = 'available', buyer_id = NULL, updated_at = NOW();

-- Asegurar que no quede nada en validated_cards
TRUNCATE TABLE validated_cards;

-- Asegurar que no quede nada en bingo_cards (por si acaso se usa)
TRUNCATE TABLE bingo_cards;
TRUNCATE TABLE bingo_cards_pool;
