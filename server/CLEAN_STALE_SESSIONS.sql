-- Limpiar sesiones viejas que quedaron "colgadas"
-- Esto forzará que el sistema cree una nueva sesión limpia hoy

UPDATE game_sessions 
SET status = 'completed', updated_at = NOW()
WHERE status IN ('pending', 'active') 
AND created_at < DATE_SUB(NOW(), INTERVAL 12 HOUR);
