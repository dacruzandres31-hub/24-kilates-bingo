const pool = require('./db');

async function check() {
    try {
        console.log('Checking users table fields...');
        const [rows] = await pool.query('DESCRIBE users');
        const fields = rows.map(r => r.Field);
        console.log(JSON.stringify(fields, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('❌ Check failed:', err);
        process.exit(1);
    }
}

check();
