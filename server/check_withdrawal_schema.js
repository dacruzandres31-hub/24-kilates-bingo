const pool = require('./src/db');

async function checkSchema() {
    try {
        const [columns] = await pool.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'bingo_24k' 
      AND TABLE_NAME = 'withdrawal_requests'
      AND COLUMN_NAME = 'status'
    `);

        console.log('Status column definition:');
        console.log(columns[0]);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSchema();
