const pool = require('./db');

async function checkSchema() {
    try {
        const [rows] = await pool.query('DESCRIBE deposit_requests');
        console.log('Deposit Requests Schema:', rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
