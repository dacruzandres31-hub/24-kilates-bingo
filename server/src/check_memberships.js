require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'casino_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function checkMemberships() {
    try {
        const [rows] = await pool.query('SELECT id, name, price, benefits_config FROM memberships');
        console.log('Current Memberships:');
        rows.forEach(row => {
            console.log(`ID: ${row.id}, Name: ${row.name}, Price: ${row.price}`);
            console.log('Config:', row.benefits_config);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

checkMemberships();
