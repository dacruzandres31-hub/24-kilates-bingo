const pool = require('./src/db');

async function migrate() {
    try {
        console.log("Iniciando migración: Agregar owner_id a payment_accounts...");

        // 1. Agregar columna owner_id
        await pool.query(`
            ALTER TABLE payment_accounts 
            ADD COLUMN owner_id INT NULL AFTER id,
            ADD CONSTRAINT fk_payment_accounts_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        `);
        console.log("✅ Columna owner_id y FK agregadas.");

        // 2. Crear índice para speed
        await pool.query(`
            CREATE INDEX idx_payment_owner ON payment_accounts(owner_id)
        `);
        console.log("✅ Índice idx_payment_owner creado.");

        console.log("Migración completada exitosamente.");
        process.exit(0);
    } catch (e) {
        console.error("❌ Error en migración:", e.message);
        process.exit(1);
    }
}
migrate();
