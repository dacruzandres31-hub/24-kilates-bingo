const pool = require('../db');

const initMembershipDB = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('🚀 Starting Membership System DB Initialization...');

        // 1. Create 'memberships' table
        console.log('Creating membershipts table...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        benefits_config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 2. Create 'user_subscriptions' table
        console.log('Creating user_subscriptions table...');
        await connection.query(`
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
      )
    `);

        // 3. Add columns to 'users' table (safely)
        console.log('Updating users table schema...');

        const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'subscription_tier_id'");
        if (columns.length === 0) {
            await connection.query(`
            ALTER TABLE users
            ADD COLUMN subscription_tier_id INT DEFAULT NULL,
            ADD COLUMN monthly_free_cards_balance INT DEFAULT 0,
            ADD COLUMN daily_wheel_spins_balance INT DEFAULT 0,
            ADD COLUMN last_benefit_reset TIMESTAMP DEFAULT NULL
        `);
            console.log('✅ Added membership columns to users table.');
        } else {
            console.log('ℹ️ Membership columns already exist in users table.');
        }

        // 4. Seed basic tiers
        console.log('Seeding membership tiers...');

        // Configs based on user requirements
        const bronzConfig = JSON.stringify({
            monthly_free_cards: 10,
            free_cards_room: 'gold', // Only for gold room
            wheel_extra_spin: 'renewal', // 1 spin on renewal
            chat_badge: 'bronze_animated'
        });

        const silverConfig = JSON.stringify({
            monthly_free_cards: 20,
            free_cards_room: 'gold',
            bonus_buy_threshold: 20,
            bonus_buy_reward: 2, // Buy 20 get 2
            bonus_buy_room: 'same', // Reward in same room
            wheel_daily_spins: 1,
            chat_badge: 'silver_animated'
        });

        const goldConfig = JSON.stringify({
            monthly_free_cards: 50,
            free_cards_room: 'gold',
            bonus_buy_threshold: 20,
            bonus_buy_reward: 4, // Buy 20 get 4
            bonus_buy_room: 'same',
            wheel_daily_spins: 2,
            chat_badge: 'gold_animated'
        });

        // Upsert Tiers (Update if name matches)
        // Note: We use simple insert/ignore or check existing to avoid duplicates on re-runs
        const tiers = [
            { name: 'Socio Bronce', price: 1000.00, config: bronzConfig }, // Placeholder price
            { name: 'Socio Plata', price: 2500.00, config: silverConfig },
            { name: 'Socio Oro', price: 5000.00, config: goldConfig }
        ];

        for (const tier of tiers) {
            const [existing] = await connection.query('SELECT id FROM memberships WHERE name = ?', [tier.name]);
            if (existing.length === 0) {
                await connection.query(
                    'INSERT INTO memberships (name, price, benefits_config) VALUES (?, ?, ?)',
                    [tier.name, tier.price, tier.config]
                );
                console.log(`✅ Inserted tier: ${tier.name}`);
            } else {
                // Optional: Update config if already exists to ensure latest rules
                await connection.query(
                    'UPDATE memberships SET benefits_config = ? WHERE id = ?',
                    [tier.config, existing[0].id]
                );
                console.log(`Updated config for tier: ${tier.name}`);
            }
        }

        console.log('✨ Database initialization for Membership System completed successfully!');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
};

initMembershipDB();
