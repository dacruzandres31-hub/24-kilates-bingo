const pool = require('./src/db');

async function check() {
    try {
        const [columns] = await pool.query("DESCRIBE payment_accounts");
        console.log(JSON.stringify(columns, null, 2));
        const [rows] = await pool.query("SELECT * FROM payment_accounts LIMIT 5");
        console.log("Sample rows:", JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
