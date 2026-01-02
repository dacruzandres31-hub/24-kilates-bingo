const pool = require('../db');

async function migrate() {
    try {
        console.log('🚀 Dando inicio a la migración de referral_rewards...');

        // 1. Agregar columna credited_at si no existe
        const [columns] = await pool.query('SHOW COLUMNS FROM referral_rewards LIKE "credited_at"');

        if (columns.length === 0) {
            await pool.query('ALTER TABLE referral_rewards ADD COLUMN credited_at TIMESTAMP NULL AFTER status');
            console.log('✅ Columna credited_at añadida con éxito.');
        } else {
            console.log('ℹ️ La columna credited_at ya existe.');
        }

        // 2. Marcar registros antiguos como acreditados ayer para no bloquear los nuevos (opcional)
        // await pool.query('UPDATE referral_rewards SET credited_at = created_at WHERE status = "credited" AND credited_at IS NULL');

        console.log('🎉 Migración completada.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error.message);
        process.exit(1);
    }
}

migrate();
