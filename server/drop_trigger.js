
const pool = require('./src/db');

async function dropTrigger() {
    try {
        console.log('🔄 Eliminando trigger conflictivo...');
        const connection = await pool.getConnection();

        try {
            await connection.query("DROP TRIGGER IF EXISTS validate_withdrawal_balance");
            console.log('✅ Trigger validate_withdrawal_balance eliminado exitosamente.');
        } catch (e) {
            console.error('❌ Error al eliminar trigger:', e.message);
        } finally {
            connection.release();
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

dropTrigger();
