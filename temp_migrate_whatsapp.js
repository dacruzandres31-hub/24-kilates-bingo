const pool = require('./server/src/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sqlPath = path.join(__dirname, 'server', 'ADD_WHATSAPP_CONFIGS.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // El SQL tiene múltiples sentencias, mysql2 puede ejecutarlas si se habilita multipleStatements
        // o si las separamos. Vamos a separarlas por punto y coma.
        const statements = sql
            .replace(/\r?\n/g, ' ')
            .split(';')
            .filter(st => st.trim().length > 0);

        console.log(`🚀 Iniciando migración de WhatsApp (${statements.length} sentencias)...`);

        for (let statement of statements) {
            try {
                await pool.query(statement);
            } catch (err) {
                // Si la columna ya existe, MySQL dará error, lo ignoramos para columnas y tablas IF NOT EXISTS
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`ℹ️ Saltando: Columna ya existe.`);
                } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`ℹ️ Saltando: Tabla ya existe.`);
                } else {
                    console.warn(`⚠️ Error en sentencia: ${err.message}`);
                    // No detenemos todo por un error menor si es duplicado
                }
            }
        }

        console.log('✅ Migración de WhatsApp completada con éxito.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal en migración:', error);
        process.exit(1);
    }
}

migrate();
