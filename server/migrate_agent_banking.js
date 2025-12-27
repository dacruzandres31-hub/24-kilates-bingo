const fs = require('fs');
const path = require('path');
const pool = require('./src/db');

async function migrate() {
    try {
        console.log('🔄 Iniciando migración de datos bancarios de agentes...');
        const sql = fs.readFileSync(path.join(__dirname, 'ADD_AGENT_BANKING.sql'), 'utf8');
        const statements = sql.split(';').filter(stmt => stmt.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                await pool.query(statement);
                console.log('✅ Ejecutado:', statement.substring(0, 50) + '...');
            }
        }
        console.log('✅ Migración completada exitosamente.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ Las columnas ya existen. Omitiendo.');
            process.exit(0);
        }
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
}

migrate();
