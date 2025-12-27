
const fs = require('fs');
const path = require('path');
const db = require('./src/db');

async function migrate() {
    try {
        console.log('🔄 Iniciando actualización de Tabla Depósitos...');

        const sqlPath = path.join(__dirname, 'UPDATE_DEPOSIT_DETAILS.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        const statements = sql
            .replace(/--.*$/gm, '')
            .split(';')
            .map(st => st.trim())
            .filter(st => st.length > 0);

        const connection = await db.getConnection();

        try {
            for (const statement of statements) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                try {
                    await connection.query(statement);
                } catch (err) {
                    if (err.code === 'ER_DUP_FIELDNAME') {
                        console.log('⚠️ Column already exists, skipping.');
                    } else {
                        throw err;
                    }
                }
            }
            console.log('✅ Actualización completada exitosamente.');
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
