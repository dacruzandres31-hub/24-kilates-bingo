const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'casino_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function unsubscribeUser() {
    try {
        // Unsubscribe the latest user (the one we likely subscribed)
        const [users] = await pool.query('SELECT id, username FROM users ORDER BY updated_at DESC LIMIT 1');
        if (users.length === 0) return;

        const user = users[0];
        console.log(`Unsubscribing user ${user.username} (ID: ${user.id})...`);

        await pool.query('UPDATE user_subscriptions SET status = "cancelled" WHERE user_id = ?', [user.id]);
        await pool.query('UPDATE users SET subscription_tier_id = NULL WHERE id = ?', [user.id]);

        console.log('✅ User unsubscribed. Should see plans list now.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

unsubscribeUser();
