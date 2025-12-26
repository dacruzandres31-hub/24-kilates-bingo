const pool = require('./src/db');

async function inspect() {
    try {
        const [columns] = await pool.query('DESCRIBE users');
        console.log('Users Table Columns:', columns.map(c => c.Field));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
