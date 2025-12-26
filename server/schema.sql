-- CONFIGURACIÓN INICIAL
CREATE TYPE user_role AS ENUM ('superadmin', 'agente', 'jugador');
CREATE TYPE room_type AS ENUM ('bronce', 'plata', 'oro', 'free_starter');
CREATE TYPE stock_status AS ENUM ('available', 'sold', 'discarded');

-- 1. TABLA DE USUARIOS (Jerarquía Recursiva + Unicidad)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    parent_id INT REFERENCES users(id),
    balance DECIMAL(15, 2) DEFAULT 0.00,
    can_process_payouts BOOLEAN DEFAULT FALSE,
    last_deposit_at TIMESTAMP,
    equipped_avatar_frame_id INT,
    equipped_card_skin_id INT,
    equipped_chat_effect_id INT,
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Constraint de Unicidad (Muro Final)
ALTER TABLE users ADD CONSTRAINT unique_username UNIQUE (username);

-- 2. TABLA DE SESIONES (Pozos y Cascada)
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    room room_type NOT NULL,
    start_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    current_pot_bingo DECIMAL(15, 2) DEFAULT 0.00,
    current_pot_linea DECIMAL(15, 2) DEFAULT 0.00,
    current_pot_jackpot DECIMAL(15, 2) DEFAULT 0.00,
    jackpot_source_id INT REFERENCES game_sessions(id),
    is_preventa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. STOCK DE CARTONES (Ciclo de Vida)
CREATE TABLE daily_stock_cards (
    id SERIAL PRIMARY KEY,
    room room_type NOT NULL,
    serial_number INT NOT NULL,
    grid_numbers JSONB NOT NULL,
    play_date DATE NOT NULL,
    play_time TIME NOT NULL,
    status stock_status DEFAULT 'available',
    buyer_id INT REFERENCES users(id),
    price DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda rápida
CREATE INDEX idx_available_cards ON daily_stock_cards(room, play_date, status);
CREATE INDEX idx_daily_stock_date ON daily_stock_cards(play_date);
CREATE INDEX idx_daily_stock_buyer ON daily_stock_cards(buyer_id, play_date);

-- 4. AUDITORÍA Y TRAZABILIDAD (Money Trail)
CREATE TABLE audit_revenue (
    id SERIAL PRIMARY KEY,
    purchase_id UUID DEFAULT gen_random_uuid(),
    player_id INT REFERENCES users(id),
    agent_path JSONB,
    amount DECIMAL(15, 2),
    transaction_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. GAMIFICACIÓN E INVENTARIO
CREATE TABLE cosmetic_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL, -- 'avatar_frame', 'card_skin', 'chat_effect', 'badge'
    asset_url VARCHAR(255),
    rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'legendary'
    color_hex VARCHAR(7),
    animation_class VARCHAR(50),
    is_free_available BOOLEAN DEFAULT FALSE, -- Si se puede ganar gratis en STARTER
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_inventory (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES cosmetic_items(id),
    equipped BOOLEAN DEFAULT FALSE,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id)
);

-- 6. PREMIOS Y COBROS
CREATE TABLE prize_claims (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    amount DECIMAL(15, 2),
    cbu_alias VARCHAR(100),
    whatsapp VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== TABLAS DE GAMIFICACIÓN "CLUB 24K" ==========

-- 7. CONFIGURACIÓN DE NIVELES (Rango VIP)
CREATE TABLE gamification_levels (
    id SERIAL PRIMARY KEY,
    level_number INT UNIQUE NOT NULL,
    rank_name VARCHAR(50) NOT NULL,
    xp_required INT NOT NULL,
    visual_benefit VARCHAR(100),
    credit_reward DECIMAL(10, 2) DEFAULT 0.00,
    free_card_reward INT DEFAULT 0,
    exclusive_access BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. PROGRESO DEL JUGADOR (XP y Nivel Actual)
CREATE TABLE user_progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_xp INT DEFAULT 0,
    current_level INT DEFAULT 1,
    total_xp_lifetime INT DEFAULT 0,
    achievements_unlocked JSONB DEFAULT '[]',
    last_levelup_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. MISIONES DIARIAS Y SEMANALES
CREATE TABLE quests_daily (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_type VARCHAR(50) NOT NULL,
    quest_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    reward_type VARCHAR(20),
    reward_amount INT,
    progress_current INT DEFAULT 0,
    progress_target INT NOT NULL,
    completed_at TIMESTAMP,
    quest_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. MEDALLAS Y LOGROS (Achievements)
CREATE TABLE agent_achievements (
    id SERIAL PRIMARY KEY,
    agent_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    criteria JSONB,
    bonus_discount DECIMAL(3, 2),
    unlocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. RANKING SEMANAL DE VENDEDORES
CREATE TABLE agent_rankings (
    id SERIAL PRIMARY KEY,
    agent_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    total_sales_cards INT DEFAULT 0,
    total_sales_revenue DECIMAL(15, 2) DEFAULT 0.00,
    ranking_position INT,
    zone VARCHAR(20),
    bonus_chips_awarded INT DEFAULT 0,
    is_top_performer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== ÍNDICES PARA GAMIFICACIÓN ==========
CREATE INDEX idx_user_progress_level ON user_progress(current_level);
CREATE INDEX idx_quests_user_date ON quests_daily(user_id, quest_date);
CREATE INDEX idx_quests_completed ON quests_daily(is_completed, quest_date);
CREATE INDEX idx_agent_rankings_week ON agent_rankings(week_start_date, ranking_position);
CREATE INDEX idx_agent_achievements_agent ON agent_achievements(agent_id);
