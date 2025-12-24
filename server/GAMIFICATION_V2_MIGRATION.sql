-- ==========================================
-- GAMIFICATION V2 MIGRATION: BINGO LEGACY
-- ==========================================

-- PRE-CLEANUP (Force V2 Schema)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS user_season_progress;
DROP TABLE IF EXISTS season_levels;
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS user_streaks;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. SEASONS SYSTEM (Battle Pass)
-- ------------------------------------------
CREATE TABLE seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS season_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    season_id INT NOT NULL,
    level INT NOT NULL,
    xp_required INT NOT NULL,
    free_reward JSON, 
    premium_reward JSON,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    UNIQUE KEY unique_season_level (season_id, level)
);

CREATE TABLE IF NOT EXISTS user_season_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    season_id INT NOT NULL,
    current_xp INT DEFAULT 0,
    current_level INT DEFAULT 1,
    is_premium BOOLEAN DEFAULT FALSE,
    rewards_claimed JSON, -- e.g. [1, 2, 3] level IDs
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_season (user_id, season_id)
);

-- 2. STREAK SYSTEM (Daily Fortune)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id INT PRIMARY KEY,
    current_streak INT DEFAULT 0,
    highest_streak INT DEFAULT 0,
    last_login_date DATE,
    last_claim_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. ACHIEVEMENTS SYSTEM (Badges)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50), -- 'gameplay', 'social', 'collection', 'wealth'
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    target_value INT NOT NULL,
    reward_type VARCHAR(50), 
    reward_value JSON,
    is_hidden BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    current_value INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id)
);

-- 4. INITIAL DATA SEEDING
-- ------------------------------------------

-- Create Season 1: "Genesis" (Starts today, lasts 30 days)
INSERT INTO seasons (name, start_date, end_date, is_active)
SELECT 'Temporada 1: Génesis', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), TRUE
WHERE NOT EXISTS (SELECT 1 FROM seasons WHERE name = 'Temporada 1: Génesis');

-- Seed Levels for Season 1 (Example: 50 Levels)
-- We'll just insert a few key levels for testing, a script can fill the rest
INSERT INTO season_levels (season_id, level, xp_required, free_reward, premium_reward)
SELECT id, 1, 100, '{"type":"credits","amount":100}', '{"type":"credits","amount":500}'
FROM seasons WHERE name = 'Temporada 1: Génesis'
LIMIT 1;

INSERT INTO season_levels (season_id, level, xp_required, free_reward, premium_reward)
SELECT id, 2, 250, '{"type":"ticket","quantity":1}', '{"type":"ticket","quantity":5}'
FROM seasons WHERE name = 'Temporada 1: Génesis'
LIMIT 1;

-- Seed Achievements
INSERT INTO achievements (code, category, title, description, target_value, reward_type, reward_value) VALUES
('FIRST_WIN', 'gameplay', 'Primera Victoria', 'Gana tu primera partida de Bingo o Línea', 1, 'badge', '{"icon":"first_blood"}'),
('HIGH_ROLLER', 'wealth', 'Magnate', 'Compra 100 cartones en total', 100, 'credits', '{"amount":1000}'),
('SOCIAL_BUTTERFLY', 'social', 'Sociable', 'Envía 50 mensajes en el chat', 50, 'xp', '{"amount":500}')
ON DUPLICATE KEY UPDATE title=title;

