-- SQL para crear las tablas de membresías si no existen

CREATE TABLE IF NOT EXISTS memberships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  benefits_config JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  membership_id INT NOT NULL,
  status ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  next_billing_date TIMESTAMP,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_status (user_id, status)
);

-- Agregar columnas a users si no existen
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_tier_id INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_free_cards_balance INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_wheel_spins_balance INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_benefit_reset TIMESTAMP DEFAULT NULL;

-- Insertar tiers básicos
INSERT INTO memberships (name, price, benefits_config) VALUES
('Socio Bronce', 5000.00, '{"monthly_free_cards": 10, "free_cards_room": "gold", "wheel_extra_spin": "renewal", "chat_badge": "bronze_animated"}'),
('Socio Plata', 10000.00, '{"monthly_free_cards": 20, "free_cards_room": "gold", "bonus_buy_threshold": 20, "bonus_buy_reward": 2, "bonus_buy_room": "same", "wheel_daily_spins": 1, "chat_badge": "silver_animated"}'),
('Socio Oro', 20000.00, '{"monthly_free_cards": 50, "free_cards_room": "gold", "bonus_buy_threshold": 20, "bonus_buy_reward": 4, "bonus_buy_room": "same", "wheel_daily_spins": 2, "chat_badge": "gold_animated"}')
ON DUPLICATE KEY UPDATE benefits_config = VALUES(benefits_config);
