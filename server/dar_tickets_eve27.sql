-- Dar tickets a Eve27 para testing

-- Primero obtener los IDs de los tickets
SET @ticket_bronce_id = (SELECT id FROM cosmetic_items WHERE ticket_room = 'bronce' AND is_consumable = true LIMIT 1);
SET @ticket_plata_id = (SELECT id FROM cosmetic_items WHERE ticket_room = 'plata' AND is_consumable = true LIMIT 1);
SET @ticket_oro_id = (SELECT id FROM cosmetic_items WHERE ticket_room = 'oro' AND is_consumable = true LIMIT 1);

-- Insertar tickets en inventario de Eve27 (user_id = 1040)
INSERT INTO user_inventory (user_id, item_id, quantity, equipped, obtained_at)
VALUES
    (1040, @ticket_bronce_id, 100, FALSE, NOW()),
    (1040, @ticket_plata_id, 100, FALSE, NOW()),
    (1040, @ticket_oro_id, 100, FALSE, NOW())
ON DUPLICATE KEY UPDATE
    quantity = VALUES(quantity);

-- Verificar
SELECT u.username, ci.name, ci.ticket_room, ui.quantity
FROM user_inventory ui
JOIN cosmetic_items ci ON ui.item_id = ci.id
JOIN users u ON ui.user_id = u.id
WHERE u.username = 'Eve27' AND ci.is_consumable = true;
