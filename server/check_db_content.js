const pool = require('./src/db');

async function checkMemberships() {
    try {
        const [rows] = await pool.query('SELECT * FROM memberships');
        console.log('--- MEMBERSHIPS ---');
        console.log(JSON.stringify(rows, null, 2));

        const [users] = await pool.query('SELECT id, username, referred_by, parent_id FROM users LIMIT 5');
        console.log('--- USERS SAMPLE ---');
        console.log(JSON.stringify(users, null, 2));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkMemberships();
