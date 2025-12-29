const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    let conn;
    try {
        console.log('🔐 Conectando a la base de datos...\n');

        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'bingo2024',
            database: process.env.DB_NAME || 'bingo_24k',
            multipleStatements: true
        });

        console.log('✅ Conectado a la base de datos\n');

        // Leer el archivo SQL
        const sqlPath = path.join(__dirname, '..', 'migrations', 'CREATE_OFFLINE_WINNERS_SYSTEM.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 Ejecutando migración: CREATE_OFFLINE_WINNERS_SYSTEM.sql\n');

        // Dividir por ; y ejecutar uno por uno
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                await conn.query(statement);
                console.log(`✅ Ejecutado: ${statement.substring(0, 50)}...`);
            } catch (err) {
                // Ignorar error si la columna ya existe o si no se puede borrar lo que no existe
                if (err.code === 'ER_DUP_FIELDNAME' ||
                    err.code === 'ER_CANT_DROP_FIELD_OR_KEY' ||
                    err.message.includes('Duplicate column') ||
                    err.message.includes('Can\'t DROP')) {
                    console.log(`⚠️ Ignorado (ya procesado o inexistente): ${statement.substring(0, 50)}...`);
                } else {
                    console.error(`❌ Error en: ${statement.substring(0, 50)}...`);
                    console.error(`   Motivo: ${err.message}`);
                }
            }
        }

        console.log('\n🎉 Proceso de migración finalizado');

    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        console.error(error);
    } finally {
        if (conn) {
            await conn.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

runMigration();
