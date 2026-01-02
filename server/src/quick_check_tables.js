// Quick script to check if membership tables exist
const pool = require('./db');

async function checkTables() {
    try {
        const connection = await pool.getConnection();

        console.log('Checking memberships table...');
        const [memberships] = await connection.query("SHOW TABLES LIKE 'memberships'");
        console.log('memberships table exists:', memberships.length > 0);

        if (memberships.length > 0) {
            const [data] = await connection.query('SELECT * FROM memberships');
            console.log('Memberships data:', data);
        }

        console.log('\nChecking user_subscriptions table...');
        const [subs] = await connection.query("SHOW TABLES LIKE 'user_subscriptions'");
        console.log('user_subscriptions table exists:', subs.length > 0);

        if (subs.length > 0) {
            const [data] = await connection.query('SELECT * FROM user_subscriptions LIMIT 5');
            console.log('Subscriptions data:', data);
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTables();
