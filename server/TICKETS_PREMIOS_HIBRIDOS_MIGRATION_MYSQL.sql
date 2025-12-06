/**
 * TICKETS_PREMIOS_HIBRIDOS_MIGRATION_MYSQL.sql
 * 
 * Alteraciones de base de datos para soportar:
 * - Consumibles (Tickets)
 * - Equipables (Skins/Marcos)
 * 
 * Versión: 1.3.0 - MySQL
 */

-- ====================================
-- 1. ALTERACIÓN: cosmetic_items
-- ====================================
-- Agregar soporte para Consumibles

ALTER TABLE cosmetic_items 
ADD COLUMN is_consumable BOOLEAN DEFAULT FALSE,
ADD COLUMN max_uses INT DEFAULT NULL,
ADD COLUMN ticket_room VARCHAR(50) DEFAULT NULL;

-- Crear índices para performance
CREATE INDEX idx_cosmetic_is_consumable ON cosmetic_items(is_consumable);
CREATE INDEX idx_cosmetic_ticket_room ON cosmetic_items(ticket_room);

-- ====================================
-- 2. ALTERACIÓN: user_inventory
-- ====================================
-- Agregar soporte para cantidades (para tickets acumulables)

ALTER TABLE user_inventory 
ADD COLUMN quantity INT DEFAULT 1,
ADD COLUMN is_consumable_type BOOLEAN DEFAULT FALSE;

-- Crear índices para performance
CREATE INDEX idx_user_inventory_consumable ON user_inventory(is_consumable_type);
CREATE INDEX idx_user_inventory_quantity ON user_inventory(quantity);

-- ====================================
-- 3. TABLA NUEVA: user_tickets (Opcional)
-- ====================================
-- Tabla especializada para tracking detallado de tickets

CREATE TABLE IF NOT EXISTS user_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    ticket_type VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 1,
    expired_at TIMESTAMP NULL,
    obtained_from VARCHAR(100),
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_user_tickets_user ON user_tickets(user_id);
CREATE INDEX idx_user_tickets_type ON user_tickets(ticket_type);
CREATE INDEX idx_user_tickets_expired ON user_tickets(expired_at);

-- ====================================
-- 4. TABLA NUEVA: game_events
-- ====================================
-- Para logging de eventos del juego

CREATE TABLE IF NOT EXISTS game_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id INT NULL,
    event_type VARCHAR(50),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_game_events_user ON game_events(user_id);
CREATE INDEX idx_game_events_session ON game_events(session_id);
CREATE INDEX idx_game_events_type ON game_events(event_type);

-- ====================================
-- 5. INSERCIÓN: Items Consumibles
-- ====================================
-- Tickets para diferentes salas

INSERT INTO cosmetic_items (name, type, is_consumable, rarity, ticket_room, is_free_available, created_at)
VALUES
    ('Ticket Sala Bronce', 'ticket', TRUE, 'common', 'bronce', TRUE, CURRENT_TIMESTAMP),
    ('Ticket Sala Plata', 'ticket', TRUE, 'rare', 'plata', FALSE, CURRENT_TIMESTAMP),
    ('Ticket Sala Oro', 'ticket', TRUE, 'legendary', 'oro', FALSE, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE name = name;

-- ====================================
-- 6. VERIFICACIÓN
-- ====================================

SELECT 'Migration completed successfully' as status;
SELECT COUNT(*) as ticket_count FROM cosmetic_items WHERE type = 'ticket';
