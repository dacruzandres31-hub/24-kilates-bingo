-- RESTAURACIÓN MANUAL DE SESIONES
-- Si room_settings falla, insertamos valores por defecto para asegurar que el sistema arranque.

-- 1. Limpiar cualquier basura (por si acaso)
DELETE FROM game_sessions WHERE status = 'pending';

-- 2. Insertar Bronce
INSERT INTO game_sessions (room, status, start_time, total_paid_cards, 
                           jackpot_linea, jackpot_bingo, jackpot_pre40, 
                           created_at, updated_at)
VALUES 
('bronce', 'pending', NOW() + INTERVAL 1 DAY, 0, 1000, 5000, 100000, NOW(), NOW());

-- 3. Insertar Plata
INSERT INTO game_sessions (room, status, start_time, total_paid_cards, 
                           jackpot_linea, jackpot_bingo, jackpot_pre40, 
                           created_at, updated_at)
VALUES 
('plata', 'pending', NOW() + INTERVAL 1 DAY, 0, 2000, 10000, 200000, NOW(), NOW());

-- 4. Insertar Oro
INSERT INTO game_sessions (room, status, start_time, total_paid_cards, 
                           jackpot_linea, jackpot_bingo, jackpot_pre40, 
                           created_at, updated_at)
VALUES 
('oro', 'pending', NOW() + INTERVAL 1 DAY, 0, 5000, 25000, 500000, NOW(), NOW());
