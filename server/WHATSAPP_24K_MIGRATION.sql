-- =====================================================
-- WHATSAPP 24K PREMIUM SYSTEM - MIGRATION
-- Sistema completo de notificaciones por WhatsApp
-- =====================================================

-- 1. Tabla principal de configuración de WhatsApp por usuario
CREATE TABLE IF NOT EXISTS user_whatsapp_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    phone_number VARCHAR(20) DEFAULT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6) DEFAULT NULL,
    verification_expires DATETIME DEFAULT NULL,
    
    -- Preferencias de notificación (Jugadores)
    notify_card_purchase BOOLEAN DEFAULT TRUE,       -- Imagen del cartón al comprar
    notify_almost_win BOOLEAN DEFAULT TRUE,          -- Alertas de casi-victoria
    notify_prize_won BOOLEAN DEFAULT TRUE,           -- Celebración de premio
    notify_game_reminder BOOLEAN DEFAULT TRUE,       -- Recordatorio 15min antes
    notify_balance_update BOOLEAN DEFAULT TRUE,      -- Cambios de balance
    notify_deposit_received BOOLEAN DEFAULT TRUE,    -- Depósitos recibidos
    
    -- Preferencias de notificación (Agentes)
    notify_commission BOOLEAN DEFAULT TRUE,          -- Comisión ganada
    notify_new_player BOOLEAN DEFAULT TRUE,          -- Nuevo registro bajo su código
    notify_daily_summary BOOLEAN DEFAULT TRUE,       -- Resumen diario 23:00
    notify_withdrawal_request BOOLEAN DEFAULT FALSE, -- Solicitudes de retiro de jugadores
    
    -- Preferencias de notificación (Admins)
    notify_system_alerts BOOLEAN DEFAULT TRUE,       -- Errores del sistema
    notify_large_withdrawals BOOLEAN DEFAULT TRUE,   -- Retiros grandes (>$50k)
    notify_security_events BOOLEAN DEFAULT TRUE,     -- Eventos de seguridad
    
    -- Configuración extra
    quiet_hours_start TIME DEFAULT NULL,             -- No molestar desde
    quiet_hours_end TIME DEFAULT NULL,               -- No molestar hasta
    language VARCHAR(5) DEFAULT 'es',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_phone (phone_number),
    INDEX idx_verified (phone_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Historial de mensajes enviados
CREATE TABLE IF NOT EXISTS whatsapp_message_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message_type ENUM(
        'card_purchase', 'almost_win', 'prize_won', 'game_reminder',
        'balance_update', 'deposit_received', 'commission', 'new_player',
        'daily_summary', 'withdrawal_request', 'system_alert', 
        'security_event', 'verification', 'custom'
    ) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    message_content TEXT,
    media_url VARCHAR(500) DEFAULT NULL,
    media_type ENUM('image', 'video', 'document', 'audio', 'sticker') DEFAULT NULL,
    status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
    error_message TEXT DEFAULT NULL,
    evolution_message_id VARCHAR(100) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME DEFAULT NULL,
    delivered_at DATETIME DEFAULT NULL,
    read_at DATETIME DEFAULT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_type (user_id, message_type),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Configuración global del sistema (para SuperAdmins)
CREATE TABLE IF NOT EXISTS whatsapp_system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_by INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuración inicial
INSERT INTO whatsapp_system_config (config_key, config_value, description) VALUES
('evolution_api_url', 'https://api-whatsapp.24kilates.xyz', 'URL de Evolution API'),
('evolution_api_key', 'Bingo24K_Evolution_2026', 'API Key de Evolution'),
('evolution_instance', 'bingo24k', 'Nombre de la instancia'),
('enabled', 'true', 'Sistema activo/inactivo'),
('daily_summary_hour', '23', 'Hora del resumen diario (0-23)'),
('large_withdrawal_threshold', '50000', 'Monto para alerta de retiro grande')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 4. Plantillas de mensajes
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    template_name VARCHAR(100) NOT NULL,
    template_body TEXT NOT NULL,
    variables JSON DEFAULT NULL,  -- Variables disponibles: {username}, {amount}, {room}, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plantillas iniciales
INSERT INTO whatsapp_templates (template_key, template_name, template_body, variables) VALUES
('verification_code', 'Código de Verificación', 
 '🔐 *Bingo 24K - Verificación*\n\nTu código de verificación es: *{code}*\n\nVálido por 10 minutos.\n\n_No compartas este código con nadie._',
 '["code"]'),

('card_purchase', 'Compra de Cartón',
 '🎰 *¡Cartón Comprado!*\n\n🎫 Serial: *{cardSerial}*\n🏆 Sala: *{room}*\n💰 Precio: ${price}\n⏰ Sorteo: {gameTime}\n\n¡Buena suerte! 🍀',
 '["cardSerial", "room", "price", "gameTime"]'),

('almost_win_line', 'Casi Línea',
 '🔥 *¡CASI LÍNEA!* 🔥\n\n¡Te falta *{missing}* número para completar LÍNEA!\n\n🎫 Cartón: {cardSerial}\n🔢 Necesitas: {numbersNeeded}\n\n¡Vamos que se puede! 💪',
 '["missing", "cardSerial", "numbersNeeded"]'),

('almost_win_bingo', 'Casi Bingo',
 '🚨 *¡CASI BINGO!* 🚨\n\n¡Te faltan solo *{missing}* números para *BINGO*!\n\n🎫 Cartón: {cardSerial}\n🔢 Necesitas: {numbersNeeded}\n\n¡Esto está que arde! 🔥🔥',
 '["missing", "cardSerial", "numbersNeeded"]'),

('prize_won_line', 'Premio Línea Ganada',
 '🎉🎉🎉 *¡GANASTE LÍNEA!* 🎉🎉🎉\n\n💰 Premio: *${amount}*\n🎫 Cartón: {cardSerial}\n🏆 Sala: {room}\n\n¡Felicitaciones! Tu premio ya está acreditado 🥳\n\n_Bingo 24K - Donde los sueños se hacen realidad_',
 '["amount", "cardSerial", "room"]'),

('prize_won_bingo', 'Premio Bingo Ganado',
 '🏆🏆🏆 *¡¡¡BINGO!!!* 🏆🏆🏆\n\n💎 Premio: *${amount}*\n🎫 Cartón: {cardSerial}\n🏆 Sala: {room}\n\n¡ERES UN CAMPEÓN! 🎊🎊🎊\n\n_Bingo 24K - La suerte está de tu lado_',
 '["amount", "cardSerial", "room"]'),

('game_reminder', 'Recordatorio de Sorteo',
 '⏰ *Recordatorio*\n\nEl sorteo de sala *{room}* comienza en *15 minutos*.\n\n🎫 Tienes {cardCount} cartón(es) comprados\n💰 Pozo actual: ${jackpot}\n\n¿Vas a jugar más? ¡Ingresa ahora! 🎰',
 '["room", "cardCount", "jackpot"]'),

('deposit_received', 'Depósito Recibido',
 '💰 *Depósito Acreditado*\n\n✅ Monto: *${amount}*\n📊 Nuevo saldo: ${newBalance}\n\n¡Ya puedes comprar cartones! 🎰\n\n_Bingo 24K_',
 '["amount", "newBalance"]'),

('commission_earned', 'Comisión Ganada',
 '💵 *¡Comisión Ganada!*\n\n👤 Jugador: {playerName}\n🎫 Compra: ${purchaseAmount}\n💰 Tu comisión: *${commission}*\n📊 Balance actual: ${newBalance}\n\n¡Sigue así! 📈',
 '["playerName", "purchaseAmount", "commission", "newBalance"]'),

('new_player_registered', 'Nuevo Jugador Registrado',
 '🎉 *¡Nuevo Jugador!*\n\n👤 *{playerName}* se registró con tu código de referido.\n\n📊 Tu red ahora tiene {totalPlayers} jugadores.\n\n¡Comparte más y gana más! 🚀',
 '["playerName", "totalPlayers"]'),

('daily_summary_player', 'Resumen Diario Jugador',
 '📊 *Resumen del Día*\n\n🎫 Cartones jugados: {cardsPlayed}\n🏆 Premios ganados: ${prizesWon}\n💰 Balance actual: ${balance}\n\n_Mañana hay más oportunidades de ganar!_ 🍀',
 '["cardsPlayed", "prizesWon", "balance"]'),

('daily_summary_agent', 'Resumen Diario Agente',
 '📈 *Resumen del Día - Agente*\n\n👥 Jugadores activos: {activePlayers}\n🎫 Cartones vendidos: {cardsSold}\n💰 Comisiones: *${commissions}*\n📊 Balance: ${balance}\n\n_Bingo 24K - Panel de Agente_',
 '["activePlayers", "cardsSold", "commissions", "balance"]'),

('withdrawal_approved', 'Retiro Aprobado',
 '✅ *Retiro Aprobado*\n\n💰 Monto: *${amount}*\n🏦 Destino: {destination}\n📝 ID: #{withdrawalId}\n\nEl pago será procesado en las próximas horas.\n\n_Bingo 24K_',
 '["amount", "destination", "withdrawalId"]'),

('security_alert', 'Alerta de Seguridad',
 '🚨 *Alerta de Seguridad*\n\n{alertMessage}\n\n📍 IP: {ip}\n⏰ Hora: {time}\n\n_Si no fuiste tú, cambia tu contraseña inmediatamente._',
 '["alertMessage", "ip", "time"]')

ON DUPLICATE KEY UPDATE 
    template_body = VALUES(template_body),
    variables = VALUES(variables);

-- 5. Tabla de colas de mensajes (para reintentos y procesamiento batch)
CREATE TABLE IF NOT EXISTS whatsapp_message_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    template_key VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    variables JSON NOT NULL,
    priority TINYINT DEFAULT 5,  -- 1=Alta, 5=Normal, 10=Baja
    retry_count TINYINT DEFAULT 0,
    max_retries TINYINT DEFAULT 3,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    scheduled_for DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status_scheduled (status, scheduled_for),
    INDEX idx_priority (priority, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Agregar columna phone_number a users si no existe
-- (Puede que ya exista, por eso usamos procedimiento)
DELIMITER //
CREATE PROCEDURE add_phone_if_not_exists()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'phone_number'
    ) THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL;
    END IF;
END //
DELIMITER ;

CALL add_phone_if_not_exists();
DROP PROCEDURE IF EXISTS add_phone_if_not_exists;

-- Crear índice en phone_number (ignorar si ya existe)
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'users' AND index_name = 'idx_users_phone');
SET @sqlstmt := IF(@exist > 0, 'SELECT ''Index already exists''', 'CREATE INDEX idx_users_phone ON users(phone_number)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'WhatsApp 24K Premium System - Migration Complete!' AS status;
