const axios = require('axios');
require('dotenv').config();
const mysql = require('mysql2/promise');

const API_URL = 'http://localhost:3000/api';
// Using a known test user credentials (admin/admin123 or from previous logs)
// Or I'll just look up a user in DB to modify.

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'casino_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function run() {
    try {
        // 1. Check Plans API
        console.log('--- Checking /api/memberships via DB directly first (simulating Service) ---');
        const [plans] = await pool.query('SELECT * FROM memberships');
        console.log('Plans found in DB:', plans.map(p => ({ id: p.id, name: p.name })));

        const goldPlan = plans.find(p => p.name.includes('Oro'));
        if (!goldPlan) {
            console.error('❌ CRITICAL: Socio Oro not found in DB!');
            return;
        } else {
            console.log('✅ Socio Oro found with ID:', goldPlan.id);
        }

        // 2. Update User to Gold
        // Let's pick the most recent user or a specific one used for testing.
        const [users] = await pool.query('SELECT id, username FROM users ORDER BY updated_at DESC LIMIT 1');
        if (users.length === 0) {
            console.log('No users found.');
            return;
        }
        const user = users[0];
        console.log(`Updating user ${user.username} (ID: ${user.id}) to Socio Oro...`);

        // Check active sub
        const [subs] = await pool.query('SELECT * FROM user_subscriptions WHERE user_id = ? AND status = "active"', [user.id]);
        if (subs.length > 0) {
            console.log('Cancelling existing active sub...');
            await pool.query('UPDATE user_subscriptions SET status = "cancelled" WHERE id = ?', [subs[0].id]);
        }

        // Insert new sub
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1);

        await pool.query(`
            INSERT INTO user_subscriptions 
            (user_id, membership_id, status, start_date, next_billing_date, auto_renew)
            VALUES (?, ?, 'active', NOW(), ?, true)
        `, [user.id, goldPlan.id, nextBilling]);

        // Update user table
        await pool.query('UPDATE users SET subscription_tier_id = ? WHERE id = ?', [goldPlan.id, user.id]);

        console.log('✅ User forced to Gold status.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

run();
