const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'bingo2024',
            database: process.env.DB_NAME || 'bingo_24k'
        });

        console.log('🔍 Buscando tablas relacionadas con cartones...\n');

        const [tables] = await conn.query(`
      SHOW TABLES LIKE '%card%'
    `);

        console.log('📋 Tablas encontradas:');
        tables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (conn) await conn.end();
    }
}

checkTables();
