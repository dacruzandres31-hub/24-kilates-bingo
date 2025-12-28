-- Restore stock for Andy (1)
INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (1, 'bronce', 1000000, 0) ON DUPLICATE KEY UPDATE quantity = 1000000;
INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (1, 'plata', 1000000, 0) ON DUPLICATE KEY UPDATE quantity = 1000000;
INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (1, 'oro', 1000000, 0) ON DUPLICATE KEY UPDATE quantity = 1000000;

-- Restore stock for superadmin (1001)
INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (1001, 'bronce', 1000000, 0) ON DUPLICATE KEY UPDATE quantity = 1000000;
INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (1001, 'plata', 1000000, 0) ON DUPLICATE KEY UPDATE quantity = 1000000;
INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (1001, 'oro', 1000000, 0) ON DUPLICATE KEY UPDATE quantity = 1000000;

-- Restore stock for AndyNew (1037)
INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (1037, 'bronce', 1000000, 0) ON DUPLICATE KEY UPDATE quantity = 1000000;
INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (1037, 'plata', 1000000, 0) ON DUPLICATE KEY UPDATE quantity = 1000000;
INSERT INTO user_card_inventory (user_id, room, quantity, is_gift) VALUES (1037, 'oro', 1000000, 0) ON DUPLICATE KEY UPDATE quantity = 1000000;
