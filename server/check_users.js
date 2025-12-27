const pool = require('./src/db');

async function check() {
    try {
        const [rows] = await pool.query("SELECT id, username, role FROM users WHERE role = 'superadmin' OR username LIKE '%Andy%'");
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
