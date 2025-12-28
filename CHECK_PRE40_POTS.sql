-- Script para verificar y resetear pozos Pre-40

-- 1. Ver estado actual de room_settings
SELECT 
    room,
    accumulated_pot_pre40,
    jackpot_pre40
FROM room_settings 
WHERE room IN ('bronce', 'plata', 'oro');

-- 2. Ver estado actual de game_sessions
SELECT 
    id,
    room,
    jackpot_bingo,
    jackpot_linea,
    jackpot_pre40,
    status,
    created_at
FROM game_sessions 
WHERE room IN ('bronce', 'plata', 'oro')
ORDER BY created_at DESC 
LIMIT 10;

-- 3. RESETEAR pozos Pre-40 a 0 (ejecutar solo si es necesario)
-- UPDATE room_settings 
-- SET accumulated_pot_pre40 = 0, jackpot_pre40 = 0
-- WHERE room IN ('bronce', 'plata', 'oro');

-- UPDATE game_sessions 
-- SET jackpot_pre40 = 0
-- WHERE room IN ('bronce', 'plata', 'oro') 
-- AND status IN ('pending', 'active');
