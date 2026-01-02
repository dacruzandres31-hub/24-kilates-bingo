const pool = require('../db');
const fs = require('fs');
const path = require('path');

async function applyReferralMigration() {
    console.log('🚀 Iniciando migración de Sistema de Referidos...');

    const queries = [
        "ALTER TABLE users ADD COLUMN referral_code VARCHAR(10) UNIQUE AFTER role",
        "ALTER TABLE users ADD COLUMN referred_by INT NULL AFTER referral_code",
        "ALTER TABLE users ADD CONSTRAINT fk_referred_by FOREIGN KEY (referred_by) REFERENCES users(id)",
        "CREATE TABLE IF NOT EXISTS referral_rewards (id INT AUTO_INCREMENT PRIMARY KEY, referrer_id INT NOT NULL, referred_user_id INT NOT NULL, reward_type ENUM('chips', 'cards', 'other') DEFAULT 'chips', amount DECIMAL(15,2) DEFAULT 0, description VARCHAR(255), status ENUM('pending', 'credited') DEFAULT 'credited', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (referrer_id) REFERENCES users(id), FOREIGN KEY (referred_user_id) REFERENCES users(id))",
        "CREATE INDEX idx_users_referral_code ON users(referral_code)"
    ];

    for (const query of queries) {
        try {
            await pool.query(query);
            console.log(`✅ Ejecutado: ${query.substring(0, 50)}...`);
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME' || error.errno === 1061) {
                console.log(`ℹ️ Ya existe, saltando...`);
            } else {
                console.error(`❌ Error: ${error.message}`);
            }
        }
    }

    console.log('🏁 Migración finalizada.');
    process.exit(0);
}

applyReferralMigration();
