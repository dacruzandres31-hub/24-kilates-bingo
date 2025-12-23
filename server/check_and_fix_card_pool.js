const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('🔍 Verificando columna is_gift en card_pool...');

        try {
            await conn.query('SELECT is_gift FROM card_pool LIMIT 1');
            console.log('✅ La columna is_gift YA EXISTE en card_pool.');
        } catch (e) {
            console.log('⚠️ La columna NO existe en card_pool. Creándola...');

            try {
                await conn.query(`
          ALTER TABLE card_pool
          ADD COLUMN is_gift BOOLEAN DEFAULT FALSE COMMENT 'Indica si el cartón es de regalo (PLUS)'
        `);
                console.log('✅ Columna is_gift creada en card_pool.');
            } catch (addError) {
                if (addError.code === 'ER_DUP_FIELDNAME') {
                    console.log('✅ La columna ya existía.');
                } else {
                    throw addError;
                }
            }
        }

        await conn.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
        process.exit(1);
    }
})();
