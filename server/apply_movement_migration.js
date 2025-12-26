const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
};

async function runMigration() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', 'expand_movement_type.sql'), 'utf8');

        console.log('Running migration: expand_movement_type.sql');
        await connection.query(sql);
        console.log('✅ Migration executed successfully.');

    } catch (error) {
        console.error('❌ Error executing migration:', error);
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
