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

async function insertGoldMembership() {
    try {
        const config = {
            monthly_free_cards: 90,
            wheel_daily_spins: 1,
            daily_bronze_cards: 3
        };

        const [result] = await pool.query(
            'INSERT INTO memberships (name, price, benefits_config, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
            ['Socio Oro', 30000.00, JSON.stringify(config)]
        );

        console.log('Inserted Socio Oro with ID:', result.insertId);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

insertGoldMembership();
