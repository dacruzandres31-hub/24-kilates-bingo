const pool = require('../db');

async function checkSystemAccounts() {
    try {
        console.log('--- Verifying System Accounts (owner_id IS NULL) ---');

        const [rows] = await pool.query(`
            SELECT id, alias, cbu, bank_name, holder_name, is_active, owner_id, current_daily_volume, daily_limit 
            FROM payment_accounts 
            WHERE owner_id IS NULL
        `);

        if (rows.length === 0) {
            console.error('❌ NO SYSTEM ACCOUNTS FOUND (owner_id IS NULL)');
        } else {
            console.log(`✅ Found ${rows.length} system accounts:`);
            rows.forEach(acc => {
                console.log(`ID: ${acc.id} | Alias: ${acc.alias} | Active: ${acc.is_active} | Vol: ${acc.current_daily_volume}/${acc.daily_limit}`);
            });
        }

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        process.exit();
    }
}

checkSystemAccounts();
