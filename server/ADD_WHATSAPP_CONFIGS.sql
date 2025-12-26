-- MIGRACIÓN: SISTEMA DE COMPROBANTES VÍA WHATSAPP (DISTRIBUIDO)
-- Versión 1.6.0

-- 1. Actualizar tabla de usuarios para soportar teléfono y configuración de notificaciones
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled BOOLEAN DEFAULT TRUE;

-- 2. Tabla para configuración de Gateways de WhatsApp (exclusivo por Agente/Superadmin)
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gateway_type VARCHAR(20) DEFAULT 'evolution_api', -- 'evolution_api', 'wppconnect', 'manual'
    api_url TEXT,
    api_key TEXT,
    instance_name VARCHAR(100),
    is_active BOOLEAN DEFAULT FALSE,
    from_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 3. Log de envíos de comprobantes para auditoría
CREATE TABLE IF NOT EXISTS whatsapp_sent_receipts (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL,
    sender_id INT NOT NULL REFERENCES users(id), -- El agente que envía
    recipient_id INT NOT NULL REFERENCES users(id), -- El jugador que recibe
    phone_sent VARCHAR(20),
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'failed'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda
CREATE INDEX IF NOT EXISTS idx_wa_config_user ON whatsapp_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_receipt_tx ON whatsapp_sent_receipts(transaction_id);
