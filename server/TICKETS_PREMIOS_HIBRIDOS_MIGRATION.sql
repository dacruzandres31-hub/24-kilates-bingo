/**
 * TICKETS_PREMIOS_HIBRIDOS_MIGRATION.sql
 * 
 * Alteraciones de base de datos para soportar:
 * - Consumibles (Tickets)
 * - Equipables (Skins/Marcos)
 * 
 * Versión: 1.3.0
 */

-- ====================================
-- 1. ALTERACIÓN: cosmetic_items
-- ====================================
-- Agregar soporte para Consumibles

ALTER TABLE cosmetic_items 
ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_uses INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ticket_room VARCHAR(50);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_cosmetic_is_consumable ON cosmetic_items(is_consumable);
CREATE INDEX IF NOT EXISTS idx_cosmetic_ticket_room ON cosmetic_items(ticket_room);

-- ====================================
-- 2. ALTERACIÓN: user_inventory
-- ====================================
-- Agregar soporte para cantidades (para tickets acumulables)

ALTER TABLE user_inventory 
ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_consumable_type BOOLEAN DEFAULT FALSE;

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_user_inventory_consumable ON user_inventory(is_consumable_type);
CREATE INDEX IF NOT EXISTS idx_user_inventory_quantity ON user_inventory(quantity);

-- ====================================
-- 3. TABLA NUEVA: user_tickets (Opcional)
-- ====================================
-- Tabla especializada para tracking detallado de tickets

CREATE TABLE IF NOT EXISTS user_tickets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_type VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 1,
    expired_at TIMESTAMP,
    obtained_from VARCHAR(100),
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_tickets_user ON user_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tickets_type ON user_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_user_tickets_expired ON user_tickets(expired_at);

-- ====================================
-- 4. TABLA NUEVA: game_events (si no existe)
-- ====================================
-- Para logging de eventos del juego

CREATE TABLE IF NOT EXISTS game_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INT REFERENCES game_sessions(id) ON DELETE SET NULL,
    event_type VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_events_user ON game_events(user_id);
CREATE INDEX IF NOT EXISTS idx_game_events_session ON game_events(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events(event_type);

-- ====================================
-- 5. INSERCIÓN: Items Consumibles
-- ====================================
-- Tickets para diferentes salas

INSERT INTO cosmetic_items (name, type, is_consumable, rarity, ticket_room, is_free_available, created_at)
VALUES
    ('Ticket Sala Bronce', 'ticket', TRUE, 'common', 'bronce', TRUE, CURRENT_TIMESTAMP),
    ('Ticket Sala Plata', 'ticket', TRUE, 'rare', 'plata', FALSE, CURRENT_TIMESTAMP),
    ('Ticket Sala Oro', 'ticket', TRUE, 'legendary', 'oro', FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- ====================================
-- 6. VERIFICACIÓN: Contar items
-- ====================================
-- Ejecutar después de insertar para verificar

-- SELECT type, COUNT(*) FROM cosmetic_items GROUP BY type;
-- SELECT ticket_room, COUNT(*) FROM cosmetic_items WHERE type = 'ticket' GROUP BY ticket_room;
-- SELECT COUNT(*) FROM user_inventory WHERE is_consumable_type = TRUE;

-- ====================================
-- 7. ROLLBACK (Opcional - Comentado)
-- ====================================
-- Si necesitas revertir los cambios:

/*
ALTER TABLE cosmetic_items 
DROP COLUMN IF EXISTS is_consumable,
DROP COLUMN IF EXISTS max_uses,
DROP COLUMN IF EXISTS ticket_room;

ALTER TABLE user_inventory 
DROP COLUMN IF EXISTS quantity,
DROP COLUMN IF EXISTS is_consumable_type;

DROP TABLE IF EXISTS user_tickets CASCADE;
DROP TABLE IF EXISTS game_events CASCADE;

DROP INDEX IF EXISTS idx_cosmetic_is_consumable;
DROP INDEX IF EXISTS idx_cosmetic_ticket_room;
DROP INDEX IF EXISTS idx_user_inventory_consumable;
DROP INDEX IF EXISTS idx_user_inventory_quantity;
DROP INDEX IF EXISTS idx_user_tickets_user;
DROP INDEX IF EXISTS idx_user_tickets_type;
DROP INDEX IF EXISTS idx_user_tickets_expired;
DROP INDEX IF EXISTS idx_game_events_user;
DROP INDEX IF EXISTS idx_game_events_session;
DROP INDEX IF EXISTS idx_game_events_type;
*/
