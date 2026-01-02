const pool = require('../db');

async function checkUsers() {
    try {
        console.log('=== CHECKING USERS ===\n');

        const [users] = await pool.query(`
            SELECT id, username, role 
            FROM users 
            WHERE role IN ('jugador', 'agente', 'superadmin')
            ORDER BY role, id
            LIMIT 10
        `);

        console.log('Available users:');
        users.forEach(u => {
            console.log(`  - ${u.username} (${u.role}) [ID: ${u.id}]`);
        });

        console.log('\n=== CHECKING SYSTEM ACCOUNTS ===\n');

        const [accounts] = await pool.query(`
            SELECT id, alias, bank_name, is_active, owner_id
            FROM payment_accounts
            WHERE owner_id IS NULL
        `);

        console.log(`System accounts (owner_id = NULL): ${accounts.length}`);
        accounts.forEach(acc => {
            console.log(`  - ${acc.alias} (${acc.bank_name}) - Active: ${acc.is_active}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkUsers();
