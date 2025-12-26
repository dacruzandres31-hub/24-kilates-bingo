require('dotenv').config({ path: './.env' });
if (!process.env.DB_PASSWORD) require('dotenv').config({ path: '../.env' });

const pool = require('./src/db');

async function migrate() {
    try {
        console.log('Applying migration: Add agent_bonus_percentage to room_settings...');

        // Check if column exists
        const [columns] = await pool.query("SHOW COLUMNS FROM room_settings LIKE 'agent_bonus_percentage'");
        if (columns.length > 0) {
            console.log('Column agent_bonus_percentage already exists. Skipping.');
            process.exit(0);
        }

        await pool.query(`
            ALTER TABLE room_settings 
            ADD COLUMN agent_bonus_percentage DECIMAL(5,2) DEFAULT 10.00 AFTER card_price
        `);

        console.log('Migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
