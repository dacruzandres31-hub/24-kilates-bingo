-- MIGRACIÓN: SISTEMA DE REFERIDOS

-- 1. Agregar columnas a la tabla de usuarios
ALTER TABLE users ADD COLUMN referral_code VARCHAR(10) UNIQUE AFTER role;
ALTER TABLE users ADD COLUMN referred_by INT NULL AFTER referral_code;
ALTER TABLE users ADD CONSTRAINT fk_referred_by FOREIGN KEY (referred_by) REFERENCES users(id);

-- 2. Crear tabla de recompensas por referidos
CREATE TABLE IF NOT EXISTS referral_rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT NOT NULL,
  referred_user_id INT NOT NULL,
  reward_type ENUM('chips', 'cards', 'other') DEFAULT 'chips',
  amount DECIMAL(15,2) DEFAULT 0,
  description VARCHAR(255),
  status ENUM('pending', 'credited') DEFAULT 'credited',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id),
  FOREIGN KEY (referred_user_id) REFERENCES users(id)
);

-- 3. Índice para búsqueda rápida por código
CREATE INDEX idx_users_referral_code ON users(referral_code);
