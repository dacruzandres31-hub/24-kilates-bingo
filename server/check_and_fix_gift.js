const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('🔍 Verificando columna is_gift...');

        try {
            // Intentar seleccionar la columna
            await conn.query('SELECT is_gift FROM bingo_cards_pool LIMIT 1');
            console.log('✅ La columna is_gift YA EXISTE. No es necesario hacer nada.');
        } catch (e) {
            console.log('⚠️ La columna NO existe (o error de acceso). Intentando crearla sin IF NOT EXISTS...');

            try {
                await conn.query(`
          ALTER TABLE bingo_cards_pool
          ADD COLUMN is_gift BOOLEAN DEFAULT FALSE COMMENT 'Indica si el cartón es de regalo (PLUS)'
        `);
                console.log('✅ Columna is_gift creada exitosamente.');
            } catch (addError) {
                // Si falla porque ya existe (pero el select falló?), es raro.
                if (addError.code === 'ER_DUP_FIELDNAME') {
                    console.log('✅ La columna ya existía (error ER_DUP_FIELDNAME ignorable).');
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
