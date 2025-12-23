const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('🔄 Aplicando corrección de columna is_gift...');

        // 1. Agregar columna is_gift
        try {
            await conn.query(`
        ALTER TABLE bingo_cards_pool
        ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE COMMENT 'Indica si el cartón es de regalo (PLUS)'
      `);
            console.log('✅ Columna is_gift agregada (o ya existía)');
        } catch (e) {
            // Ignorar si ya existe (aunque IF NOT EXISTS debería manejarlo, MySQL viejo a veces falla)
            console.log('⚠️ Aviso al agregar columna:', e.message);
        }

        // 2. Crear índice
        try {
            await conn.query(`CREATE INDEX idx_is_gift ON bingo_cards_pool(is_gift)`);
            console.log('✅ Índice idx_is_gift creado');
        } catch (e) {
            console.log('⚠️ Aviso al crear índice (puede que ya exista):', e.message);
        }

        await conn.end();
        console.log('✅ Migración finalizada con éxito');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error crítico:', error.message);
        process.exit(1);
    }
})();
