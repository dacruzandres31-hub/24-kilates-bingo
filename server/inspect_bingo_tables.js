const pool = require('./src/db');

async function inspect() {
    try {
        const [columns] = await pool.query('DESCRIBE bingo_cards');
        console.log('bingo_cards Columns:', columns.map(c => c.Field));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
