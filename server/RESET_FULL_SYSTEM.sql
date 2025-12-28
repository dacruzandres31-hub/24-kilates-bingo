-- SCRIPT DE REINICIO TOTAL DEL SISTEMA (MODO "SANO")
-- Este script limpia todo el estado de juego para probar el flujo desde cero.

-- 1. CERRAR TODAS LAS SESIONES ANTIGUAS
UPDATE game_sessions SET status = 'completed', updated_at = NOW() WHERE status IN ('pending', 'active', 'playing', 'waiting');

-- 2. LIMPIAR CARTONES EN JUEGO (VALIDADOS)
TRUNCATE TABLE validated_cards;

-- 3. RESETEAR EL INVENTARIO DE CARTONES (Volver a ponerlos a la venta)
-- Esto permite volver a comprar los mismos cartones.
UPDATE daily_stock_cards 
SET status = 'available', buyer_id = NULL, updated_at = NOW()
WHERE status = 'sold';

-- 4. LIMPIAR BOLILLAS DE SESIONES ANTERIORES (Opcional, pero bueno para limpieza)
-- No usamos TRUNCATE por las FKs, borramos las de sesiones activas (que ya cerramos)
DELETE FROM game_session_balls WHERE game_session_id IN (SELECT id FROM game_sessions WHERE updated_at >= NOW() - INTERVAL 5 MINUTE);

-- 5. CREAR NUEVAS SESIONES LIMPIAS (PENDING)
-- Se inicializan con los valores base.
INSERT INTO game_sessions (room, status, start_time, total_paid_cards, total_gift_cards, jackpot_linea, jackpot_bingo, jackpot_pre40, created_at, updated_at)
SELECT 
    room, 
    'pending' as status, 
    NOW() as start_time, 
    0 as total_paid_cards, 
    0 as total_gift_cards, 
    0 as jackpot_linea, 
    0 as jackpot_bingo, 
    accumulated_pot_pre40 as jackpot_pre40,
    NOW(),
    NOW()
FROM room_settings
WHERE room IN ('bronce', 'plata', 'oro');

-- 6. RESETEAR CONTADORES DE PRE-40 EN ROOM_SETTINGS (OPCIONAL)
-- El usuario no pidió explícitamente borrar el acumulado global, pero los pozos de sesión arrancan limpios.
-- Si se requiere, descomentar:
-- UPDATE room_settings SET accumulated_pot_pre40 = 100000; -- Valor base ejemplo
