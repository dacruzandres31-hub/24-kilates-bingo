const pool = require('./src/db');

async function check() {
    try {
        const [rows] = await pool.query("SELECT id, username, role, cbu, alias, bank_name, phone_number, email FROM users WHERE id = 1");
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
