const pool = require('../db');

async function createSystemAccount() {
    try {
        console.log('--- Creating System Account (owner_id IS NULL) ---');

        // 1. Check if one already exists (double check)
        const [existing] = await pool.query('SELECT * FROM payment_accounts WHERE owner_id IS NULL');
        if (existing.length > 0) {
            console.log('✅ System account already exists:', existing[0]);
            return;
        }

        // 2. Insert new System Account
        // We need a valid bank_name, holder_name, cbu/alias. We'll use placeholders that the Admin can edit later.
        const [result] = await pool.query(`
            INSERT INTO payment_accounts 
            (alias, cbu, bank_name, holder_name, is_active, owner_id, daily_limit, current_daily_volume, created_at)
            VALUES 
            (?, ?, ?, ?, TRUE, NULL, 5000000, 0, NOW())
        `, ['ADMIN.SISTEMA', '0000000024K', 'Banco Sistema', 'Andy Admin',]);

        console.log('✅ Created System Account with ID:', result.insertId);

    } catch (err) {
        console.error('Error creating system account:', err);
    } finally {
        process.exit();
    }
}

createSystemAccount();
