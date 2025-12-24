const pool = require('./src/db');

async function checkUser() {
    try {
        const [rows] = await pool.query("SELECT id, username, role, is_blocked, password_hash FROM users WHERE username = 'Andy'");
        console.log('User check result:', rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser();
