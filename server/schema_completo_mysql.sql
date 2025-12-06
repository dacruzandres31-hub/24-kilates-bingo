-- ============================================
-- SCHEMA COMPLETO MYSQL - BINGO 24K
-- Incluye: Base + Gamificación + Chips + Retiros
-- ============================================

USE bingo_24k;

-- ============================================
-- TABLA: bingo_cards
-- ============================================
CREATE TABLE IF NOT EXISTS bingo_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_id INT NOT NULL,
    grid_data JSON NOT NULL,
    status ENUM('active', 'winner', 'lost') DEFAULT 'active',
    price DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    seller_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_session (user_id, session_id),
    INDEX idx_status (status)
);

-- ============================================
-- TABLA: game_events
-- ============================================
CREATE TABLE IF NOT EXISTS game_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    event_type ENUM('ball_drawn', 'line_win', 'bingo_win', 'jackpot_win') NOT NULL,
    event_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id)
);

-- ============================================
-- TABLA: chips_movements (Fichas Internas)
-- ============================================
CREATE TABLE IF NOT EXISTS chips_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    movement_type ENUM('deposit', 'withdrawal', 'purchase', 'prize', 'commission', 'bonus', 'refund') NOT NULL,
    reference_type VARCHAR(50) NULL,
    reference_id INT NULL,
    description VARCHAR(255) NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_type (user_id, movement_type),
    INDEX idx_created_at (created_at)
);

-- ============================================
-- TABLA: withdrawal_requests
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    bank_account_holder VARCHAR(255) NOT NULL,
    cbu VARCHAR(22) NOT NULL,
    bank_name VARCHAR(255) NULL,
    account_type ENUM('savings', 'checking', 'other') DEFAULT 'savings',
    status ENUM('pending', 'processing', 'completed', 'rejected', 'cancelled') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    processed_by INT NULL,
    processor_role ENUM('cajero', 'superadmin') NULL,
    chips_movement_id INT NULL,
    rejection_reason VARCHAR(500) NULL,
    transfer_receipt VARCHAR(255) NULL,
    notes TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (chips_movement_id) REFERENCES chips_movements(id) ON DELETE SET NULL,
    INDEX idx_user_status (user_id, status),
    INDEX idx_status (status),
    INDEX idx_requested_at (requested_at)
);

-- ============================================
-- TABLA: gamification_progress
-- ============================================
CREATE TABLE IF NOT EXISTS gamification_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    current_level INT NOT NULL DEFAULT 1,
    xp_current INT NOT NULL DEFAULT 0,
    xp_lifetime INT NOT NULL DEFAULT 0,
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    cards_completed INT DEFAULT 0,
    total_winnings DECIMAL(15,2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_level (current_level),
    INDEX idx_xp_lifetime (xp_lifetime)
);

-- ============================================
-- TABLA: levels_config
-- ============================================
CREATE TABLE IF NOT EXISTS levels_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level_number INT NOT NULL UNIQUE,
    level_name VARCHAR(100) NOT NULL,
    xp_required INT NOT NULL,
    color_theme VARCHAR(7),
    icon_url VARCHAR(255),
    perks JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level_number (level_number)
);

-- ============================================
-- TABLA: daily_quests
-- ============================================
CREATE TABLE IF NOT EXISTS daily_quests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quest_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    quest_name VARCHAR(255) NOT NULL,
    quest_type ENUM('WIN', 'PLAY', 'COMPLETE_CARD', 'EARN_CHIPS', 'OTHER') NOT NULL,
    target_value INT NOT NULL,
    current_value INT DEFAULT 0,
    xp_reward INT NOT NULL DEFAULT 50,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, quest_date),
    INDEX idx_completed (completed)
);

-- ============================================
-- TABLA: weekly_rankings
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_rankings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    xp_earned INT DEFAULT 0,
    games_played INT DEFAULT 0,
    position INT NULL,
    rewards JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_week (user_id, week_start),
    INDEX idx_week (week_start, week_end),
    INDEX idx_position (position)
);

-- ============================================
-- TABLA: achievements
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    achievement_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    category VARCHAR(50),
    requirement_type VARCHAR(50),
    requirement_value INT,
    xp_reward INT DEFAULT 0,
    badge_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (badge_id) REFERENCES cosmetic_items(id) ON DELETE SET NULL,
    INDEX idx_category (category)
);

-- ============================================
-- TABLA: user_achievements
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_value INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    INDEX idx_user (user_id),
    INDEX idx_unlocked_at (unlocked_at)
);

-- ============================================
-- DATOS INICIALES: levels_config
-- ============================================
INSERT INTO levels_config (level_number, level_name, xp_required, color_theme, perks) VALUES
(1, 'Novato', 0, '#8B7355', '{"bonus_xp": 0, "daily_quests": 3}'),
(2, 'Bronce', 500, '#CD7F32', '{"bonus_xp": 5, "daily_quests": 3, "weekly_bonus": 50}'),
(3, 'Plata', 1500, '#C0C0C0', '{"bonus_xp": 10, "daily_quests": 4, "weekly_bonus": 100}'),
(4, 'Oro', 3500, '#FFD700', '{"bonus_xp": 15, "daily_quests": 4, "weekly_bonus": 200, "priority_support": true}'),
(5, 'Platino', 7500, '#E5E4E2', '{"bonus_xp": 25, "daily_quests": 5, "weekly_bonus": 500, "priority_support": true, "exclusive_skins": true}')
ON DUPLICATE KEY UPDATE level_name = VALUES(level_name);

-- ============================================
-- TRIGGER: Auto-inicializar gamificación
-- NOTA: Se crea por separado con Node.js
-- ============================================

SELECT 'Schema completo ejecutado exitosamente' as status;
