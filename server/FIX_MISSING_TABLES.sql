-- Crear tabla card_pool si falta
CREATE TABLE IF NOT EXISTS card_pool (
    id INT PRIMARY KEY AUTO_INCREMENT,
    card_serial VARCHAR(50) NOT NULL UNIQUE,
    room ENUM('bronce', 'plata', 'oro', 'starter') NOT NULL,
    numbers JSON NOT NULL,
    status ENUM('available', 'sold', 'discarded') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla global_card_counter ya existe - verificar que tenga datos
INSERT IGNORE INTO global_card_counter (id, counter) VALUES (1, 0);

-- Modificar room_settings para agregar 'starter' al enum
ALTER TABLE room_settings MODIFY COLUMN room ENUM('bronce','plata','oro','starter') NOT NULL;

-- Agregar room 'starter' a room_settings si falta
INSERT INTO room_settings (room, card_price, percentage_linea, percentage_bingo, percentage_acumulado, accumulated_pot_pre40) VALUES
('starter', 0, 0, 100, 0, 0)
ON DUPLICATE KEY UPDATE card_price=VALUES(card_price);

-- Crear tabla user_blocks_log si falta
CREATE TABLE IF NOT EXISTS user_blocks_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    blocked_by INT NOT NULL,
    action ENUM('block', 'unblock') NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Crear tabla payment_accounts si falta
CREATE TABLE IF NOT EXISTS payment_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_type ENUM('bank', 'nequi', 'daviplata', 'bancolombia', 'other') NOT NULL,
    account_number VARCHAR(50),
    account_holder VARCHAR(100),
    bank_name VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1,
    is_default TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Crear tabla whatsapp_configs si falta
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    phone_number VARCHAR(20),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Crear tabla admin_audit_logs si falta
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Crear tabla deposit_requests si falta
CREATE TABLE IF NOT EXISTS deposit_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    agent_id INT,
    amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    proof_url VARCHAR(255),
    notes TEXT,
    processed_by INT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Crear tabla user_subscriptions si falta
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tier VARCHAR(50) DEFAULT 'free',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active TINYINT(1) DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Crear tabla user_progress si falta
CREATE TABLE IF NOT EXISTS user_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    total_xp INT DEFAULT 0,
    current_level INT DEFAULT 1,
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    lines_won INT DEFAULT 0,
    bingos_won INT DEFAULT 0,
    total_spent DECIMAL(15,2) DEFAULT 0,
    total_won DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Crear tabla gamification_levels si falta
CREATE TABLE IF NOT EXISTS gamification_levels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    level_number INT NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    min_xp INT NOT NULL,
    reward_type VARCHAR(50),
    reward_value INT,
    badge_url VARCHAR(255)
);

-- Insertar niveles iniciales
INSERT IGNORE INTO gamification_levels (level_number, name, min_xp, reward_type, reward_value) VALUES
(1, 'Novato', 0, NULL, NULL),
(2, 'Cobre', 500, 'ticket_bronce', 1),
(3, 'Plata Fina', 2000, 'chips', 1000),
(4, 'Oro Puro', 10000, 'chips', 5000),
(5, 'Diamante 24K', 50000, 'chips', 20000);

-- Verificar tablas
SELECT 'Tablas creadas exitosamente' as status;
SHOW TABLES;
