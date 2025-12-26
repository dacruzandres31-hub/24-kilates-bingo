const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function inspectSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query('DESCRIBE card_movements_log');
        console.log('--- card_movements_log ---');
        console.log(rows);
    } catch (error) {
        console.error('Error inspecting schema:', error);
    } finally {
        if (connection) await connection.end();
    }
}

inspectSchema();
