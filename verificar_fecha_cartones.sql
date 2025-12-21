-- Verificar que los cartones tienen la fecha correcta (21/12/2025)
-- Fecha esperada en serial: 20251221

SELECT 
    room,
    COUNT(*) as total_cartones,
    MIN(card_serial) as primer_serial,
    MAX(card_serial) as ultimo_serial,
    SUBSTRING(card_serial, 5, 8) as fecha_serial
FROM bingo_cards_pool 
GROUP BY room, SUBSTRING(card_serial, 5, 8)
ORDER BY room;

-- Verificar algunos ejemplos de cada sala
SELECT room, card_serial, status
FROM bingo_cards_pool 
WHERE room = 'starter'
LIMIT 5;

SELECT room, card_serial, status
FROM bingo_cards_pool 
WHERE room = 'bronce'
LIMIT 5;
