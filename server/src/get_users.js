const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bingo_24k'
    });

    try {
        const [rows] = await pool.query('SELECT username, role FROM users LIMIT 10');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
