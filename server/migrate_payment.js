
const fs = require('fs');
const path = require('path');
const db = require('./src/db');

async function migrate() {
    try {
        console.log('🔄 Iniciando migración de Sistema de Pagos...');

        const sqlPath = path.join(__dirname, 'ADD_PAYMENT_SYSTEM.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolons to execute independent statements
        const statements = sql
            .replace(/--.*$/gm, '') // Remove comments
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        const connection = await db.getConnection();

        try {
            for (const statement of statements) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                try {
                    await connection.query(statement);
                } catch (err) {
                    if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_ENTRY') {
                        console.log('⚠️ Index or entry already exists, skipping.');
                    } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log('⚠️ Table already exists, skipping.');
                    } else {
                        throw err;
                    }
                }
            }
            console.log('✅ Migración completada exitosamente.');
        } finally {
            connection.release();
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
}

migrate();
