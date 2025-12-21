-- Limpieza COMPLETA de cartones
-- Fecha objetivo: 21/12/2025

-- 1. Eliminar todos los cartones del pool permanente
DELETE FROM bingo_cards_pool WHERE 1=1;

-- 2. Reiniciar AUTO_INCREMENT
ALTER TABLE bingo_cards_pool AUTO_INCREMENT = 1;

-- 3. Eliminar cartones de sesiones
DELETE FROM card_pool WHERE 1=1;

-- 4. Verificación
SELECT 'Cartones en bingo_cards_pool:' as status, COUNT(*) as total FROM bingo_cards_pool
UNION ALL
SELECT 'Cartones en card_pool:' as status, COUNT(*) as total FROM card_pool;
