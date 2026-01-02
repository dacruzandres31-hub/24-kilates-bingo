const mysql = require('mysql2/promise');

async function addDailyFreeCardsColumns() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('✅ Conectado a MySQL\n');

        // Check if columns already exist
        const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'bingo_24k' 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME IN ('daily_free_cards_balance', 'daily_free_cards_last_reset')
    `);

        if (columns.length > 0) {
            console.log('ℹ️  Columnas ya existen:', columns.map(c => c.COLUMN_NAME).join(', '));
            await connection.end();
            return;
        }

        console.log('📋 Agregando columnas para cartones gratis diarios...\n');

        await connection.query(`
      ALTER TABLE users
      ADD COLUMN daily_free_cards_balance INT DEFAULT 0,
      ADD COLUMN daily_free_cards_last_reset DATE DEFAULT NULL
    `);

        console.log('✅ Columnas agregadas exitosamente:');
        console.log('   - daily_free_cards_balance: Balance de cartones gratis disponibles hoy');
        console.log('   - daily_free_cards_last_reset: Última fecha de reset');

        // Verify
        const [verify] = await connection.query(`
      DESCRIBE users
    `);

        const newColumns = verify.filter(col =>
            col.Field === 'daily_free_cards_balance' ||
            col.Field === 'daily_free_cards_last_reset'
        );

        console.log('\n📋 Verificación:');
        console.table(newColumns);

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

addDailyFreeCardsColumns();
