-- OPTIMIZACIÓN DE BASE DE DATOS - 24 KILATES BINGO
-- Índices para mejorar el rendimiento del dashboard admin y consultas frecuentes

-- 1. Historial de movimientos de chips (Tabla muy pesada)
-- Permite filtrar rápidamente por usuario y fecha para reportes financieros
ALTER TABLE chips_movements ADD INDEX IF NOT EXISTS idx_chips_user_date (user_id, created_at);
ALTER TABLE chips_movements ADD INDEX IF NOT EXISTS idx_chips_created_at (created_at);

-- 2. Inventario de cartones
-- Facilita la carga del perfil del usuario (Lobby/GameRoom)
ALTER TABLE user_card_inventory ADD INDEX IF NOT EXISTS idx_uci_user_room (user_id, room);

-- 3. Bolillero de sesiones
-- Acelera la recuperación del estado de la partida tras reinicios
ALTER TABLE game_session_balls ADD INDEX IF NOT EXISTS idx_gsb_session_order (game_session_id, draw_order);

-- 4. Notificaciones de ganadores
ALTER TABLE winners_payment_info ADD INDEX IF NOT EXISTS idx_wpi_status (status);

-- 5. Logs de auditoría
ALTER TABLE card_movements_log ADD INDEX IF NOT EXISTS idx_cml_created (created_at);
