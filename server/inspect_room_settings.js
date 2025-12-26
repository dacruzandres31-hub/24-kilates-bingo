// Cargar variables de entorno
require('dotenv').config({ path: './.env' }); // try default
if (!process.env.DB_PASSWORD) require('dotenv').config({ path: '../.env' }); // try parent if needed

const pool = require('./src/db');

async function inspect() {
    try {
        const [columns] = await pool.query('DESCRIBE room_settings');
        console.log('Room Settings Columns:', columns.map(c => c.Field));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
