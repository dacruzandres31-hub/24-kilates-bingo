const pool = require('./db');
const bcrypt = require('bcryptjs');

async function test() {
    try {
        const username = 'Andy';
        const password = 'Tasso2025';

        console.log('Testing query...');
        const [userResult] = await pool.query(
            'SELECT id, username, role, password_hash, balance, is_blocked, block_reason FROM users WHERE username = ?',
            [username]
        );
        console.log('User Result:', JSON.stringify(userResult, null, 2));

        if (userResult.length === 0) {
            console.error('User not found in DB');
            process.exit(1);
        }
        const user = userResult[0];

        console.log('Comparing password...');
        const match = await bcrypt.compare(password, user.password_hash);
        console.log('Match:', match);

        pool.end();
    } catch (e) {
        console.error('TEST FAIL:', e);
        process.exit(1);
    }
}
test();
