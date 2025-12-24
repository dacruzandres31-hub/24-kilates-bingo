const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    console.log('Running Gamification V2 Migration...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bingo_24k',
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, 'GAMIFICATION_V2_MIGRATION.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await connection.query(sql);
        console.log('✅ Gamification V2 Tables Created & Seeded!');

        // Verify
        const tables = ['seasons', 'user_season_progress', 'user_streaks', 'achievements'];
        for (const t of tables) {
            const [res] = await connection.query(`SHOW TABLES LIKE '${t}'`);
            console.log(`Table '${t}': ${res.length > 0 ? 'Existent' : 'MISSING'}`);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await connection.end();
    }
}

runMigration();
