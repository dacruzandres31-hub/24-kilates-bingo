
const path = require('path');
// Load environment variables from server/.env BEFORE requiring db
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });

const pool = require('./server/src/db');

async function addColumn() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to DB');

        // Check if column exists
        const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'bingo_24k'}' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'last_wheel_spin'
    `);

        if (columns.length > 0) {
            console.log('ℹ️ Column last_wheel_spin already exists.');
        } else {
            console.log('🔄 Adding last_wheel_spin column...');
            await connection.query(`
        ALTER TABLE users 
        ADD COLUMN last_wheel_spin DATETIME NULL DEFAULT NULL
      `);
            console.log('✅ Column added successfully.');
        }

        connection.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

addColumn();
