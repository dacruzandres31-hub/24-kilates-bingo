const pool = require('./src/db');

async function inspect() {
    try {
        const [columns] = await pool.query('DESCRIBE daily_stock_cards');
        console.log('daily_stock_cards Columns:', columns.map(c => c.Field));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
