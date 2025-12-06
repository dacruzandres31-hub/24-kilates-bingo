-- Schema MySQL para Bingo 24K (versión mínima)
-- Ejecutar antes de TICKETS_PREMIOS_HIBRIDOS_MIGRATION_MYSQL.sql

CREATE DATABASE IF NOT EXISTS bingo_24k;
USE bingo_24k;

-- Tabla users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('superadmin', 'agente', 'jugador') DEFAULT 'jugador',
    parent_id INT NULL,
    balance DECIMAL(10,2) DEFAULT 0.00,
    can_process_payouts BOOLEAN DEFAULT FALSE,
    last_deposit_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabla game_sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room VARCHAR(50) NOT NULL,
    status ENUM('waiting', 'active', 'finished') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla cosmetic_items (sin columnas de tickets todavía)
CREATE TABLE IF NOT EXISTS cosmetic_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(50),
    asset_url VARCHAR(255),
    rarity ENUM('common', 'rare', 'legendary') DEFAULT 'common',
    color_hex VARCHAR(7),
    animation_class VARCHAR(100),
    is_free_available BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla user_inventory (sin columnas de quantity todavía)
CREATE TABLE IF NOT EXISTS user_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    equipped BOOLEAN DEFAULT FALSE,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES cosmetic_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_item (user_id, item_id)
);

-- Tabla audit_revenue
CREATE TABLE IF NOT EXISTS audit_revenue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NULL,
    agent_path TEXT,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabla daily_stock_cards
CREATE TABLE IF NOT EXISTS daily_stock_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_type VARCHAR(50) NOT NULL,
    quantity INT DEFAULT 1,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla prize_claims
CREATE TABLE IF NOT EXISTS prize_claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insertar usuario admin por defecto
INSERT INTO users (username, password_hash, role, balance) 
VALUES ('admin', '$2a$10$kZXhYC8zPZZqU8Jy0h7kHOqN6qGxN9RzqG7XqX1X2X3X4X5X6X7X8', 'superadmin', 10000.00)
ON DUPLICATE KEY UPDATE username = username;

SELECT 'Schema creado exitosamente' as status;
