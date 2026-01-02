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

async function listMemberships() {
    try {
        const [rows] = await pool.query('SELECT id, name, price FROM memberships ORDER BY price ASC');
        console.log('--- DB MEMBERSHIPS START ---');
        console.log(JSON.stringify(rows, null, 2));
        console.log('--- DB MEMBERSHIPS END ---');

        const oro = rows.find(r => r.name.includes('Oro'));
        if (oro) {
            console.log('✅ Socio Oro exists in DB.');
        } else {
            console.log('❌ Socio Oro DOES NOT exist in DB.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

listMemberships();
