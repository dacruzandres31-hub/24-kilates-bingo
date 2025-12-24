
const pool = require('./src/db');

async function checkColumns() {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query("SHOW COLUMNS FROM chips_movements");
        console.log('Columns:', rows.map(r => `${r.Field} (${r.Null})`));
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
