-- RESETEAR POZOS PRE-40 A CERO

-- 1. Resetear en room_settings (solo tiene accumulated_pot_pre40)
UPDATE room_settings 
SET accumulated_pot_pre40 = 0
WHERE room IN ('bronce', 'plata', 'oro');

-- 2. Resetear en game_sessions (solo sesiones activas/pendientes)
UPDATE game_sessions 
SET jackpot_pre40 = 0
WHERE room IN ('bronce', 'plata', 'oro') 
AND status IN ('pending', 'active');

-- 3. Verificar que se resetearon
SELECT 'room_settings' as tabla, room, accumulated_pot_pre40
FROM room_settings 
WHERE room IN ('bronce', 'plata', 'oro');

SELECT 'game_sessions' as tabla, room, jackpot_pre40, status
FROM game_sessions 
WHERE room IN ('bronce', 'plata', 'oro') 
AND status IN ('pending', 'active');
