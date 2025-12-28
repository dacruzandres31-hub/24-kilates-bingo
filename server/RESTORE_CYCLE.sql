-- Script de Restauración de Ciclo de Juego
-- 1. Crear nueva sesión PENDIENTE
INSERT INTO game_sessions (room, status, start_time, created_at, updated_at)
VALUES ('bronce', 'pending', DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NOW());

-- Obtener el ID de la nueva sesión
SET @new_session_id = LAST_INSERT_ID();

-- 2. Encontrar la última sesión CERRADA que tuvo ventas (para rescatar cartones)
SET @old_session_id = (
    SELECT id FROM game_sessions 
    WHERE status = 'completed' 
    AND total_paid_cards > 0 
    ORDER BY updated_at DESC LIMIT 1
);

-- 3. Mover cartones vendidos de la sesión vieja a la nueva (Si existe)
UPDATE bingo_cards 
SET game_session_id = @new_session_id 
WHERE game_session_id = @old_session_id 
AND status = 'sold';

-- 4. Actualizar contadores de la nueva sesión con lo rescatado
UPDATE game_sessions 
SET 
    total_paid_cards = (SELECT COUNT(*) FROM bingo_cards WHERE game_session_id = @new_session_id AND status = 'sold'),
    total_gift_cards = (SELECT COUNT(*) FROM bingo_cards WHERE game_session_id = @new_session_id AND status = 'sold' AND is_gift = 1)
WHERE id = @new_session_id;

-- 5. Asegurar que las otras salas también tengan sesión pendiente (para evitar errores en Admin)
INSERT INTO game_sessions (room, status, start_time, created_at, updated_at)
SELECT 'starter', 'pending', DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM game_sessions WHERE room = 'starter' AND status IN ('pending', 'active'));

INSERT INTO game_sessions (room, status, start_time, created_at, updated_at)
SELECT 'plata', 'pending', DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM game_sessions WHERE room = 'plata' AND status IN ('pending', 'active'));

INSERT INTO game_sessions (room, status, start_time, created_at, updated_at)
SELECT 'oro', 'pending', DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM game_sessions WHERE room = 'oro' AND status IN ('pending', 'active'));
