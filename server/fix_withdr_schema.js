
const pool = require('./src/db');

async function fixSchema() {
    try {
        console.log('🔄 Iniciando corrección de esquema...');
        const connection = await pool.getConnection();

        try {
            // 1. Drop Constraint Check CBU Length
            console.log('🗑️ Eliminando constraint chk_cbu_format...');
            try {
                await connection.query("ALTER TABLE withdrawal_requests DROP CONSTRAINT chk_cbu_format");
                console.log('✅ Constraint eliminado.');
            } catch (e) {
                console.log('⚠️ Warning al eliminar constraint (puede que no exista):', e.message);
            }

            // 2. Modify CBU Column to VARCHAR(255)
            console.log('📝 Modificando columna CBU a VARCHAR(255)...');
            await connection.query("ALTER TABLE withdrawal_requests MODIFY cbu VARCHAR(255) NOT NULL");
            console.log('✅ Columna CBU modificada exitosamente.');

        } finally {
            connection.release();
        }

        console.log('🏁 Proceso finalizado.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

fixSchema();
