const pool = require('../db');

async function debugAccounts() {
    try {
        console.log('=== DEBUGGING PAYMENT ACCOUNTS ===\n');

        // 1. Check all payment accounts
        const [allAccounts] = await pool.query(`
            SELECT 
                pa.id, 
                pa.alias, 
                pa.bank_name, 
                pa.holder_name, 
                pa.is_active, 
                pa.owner_id,
                pa.current_daily_volume,
                pa.daily_limit,
                u.username as owner_username,
                u.role as owner_role
            FROM payment_accounts pa
            LEFT JOIN users u ON pa.owner_id = u.id
            ORDER BY pa.owner_id, pa.id
        `);

        console.log(`Total accounts: ${allAccounts.length}\n`);

        allAccounts.forEach(acc => {
            console.log(`ID: ${acc.id}`);
            console.log(`  Alias: ${acc.alias}`);
            console.log(`  Bank: ${acc.bank_name}`);
            console.log(`  Holder: ${acc.holder_name}`);
            console.log(`  Active: ${acc.is_active ? 'YES' : 'NO'}`);
            console.log(`  Owner ID: ${acc.owner_id || 'NULL (System)'}`);
            console.log(`  Owner: ${acc.owner_username || 'N/A'} (${acc.owner_role || 'N/A'})`);
            console.log(`  Volume: ${acc.current_daily_volume}/${acc.daily_limit}`);
            console.log('---');
        });

        // 2. Check Andy's user ID
        console.log('\n=== ANDY USER INFO ===');
        const [andyUser] = await pool.query(`
            SELECT id, username, role 
            FROM users 
            WHERE username = 'admin' OR role = 'superadmin'
            LIMIT 1
        `);

        if (andyUser.length > 0) {
            console.log(`Andy's User ID: ${andyUser[0].id}`);
            console.log(`Username: ${andyUser[0].username}`);
            console.log(`Role: ${andyUser[0].role}`);
        } else {
            console.log('⚠️ No superadmin user found!');
        }

        // 3. Test the query that should find system accounts
        console.log('\n=== TESTING SYSTEM ACCOUNT QUERY ===');
        const [systemAccounts] = await pool.query(`
            SELECT id, alias, cbu, bank_name, holder_name
            FROM payment_accounts
            WHERE is_active = TRUE
            AND current_daily_volume < daily_limit
            AND owner_id IS NULL
            ORDER BY current_daily_volume ASC
            LIMIT 1
        `);

        if (systemAccounts.length > 0) {
            console.log('✅ System account found:', systemAccounts[0]);
        } else {
            console.log('❌ No system accounts found with query');
        }

        // 4. If Andy has an account with owner_id set, show it
        if (andyUser.length > 0) {
            console.log('\n=== ANDY\'S OWNED ACCOUNTS ===');
            const [andyAccounts] = await pool.query(`
                SELECT id, alias, bank_name, is_active, current_daily_volume, daily_limit
                FROM payment_accounts
                WHERE owner_id = ?
            `, [andyUser[0].id]);

            if (andyAccounts.length > 0) {
                console.log(`Found ${andyAccounts.length} account(s) owned by Andy:`);
                andyAccounts.forEach(acc => {
                    console.log(`  - ${acc.alias} (Active: ${acc.is_active}, Vol: ${acc.current_daily_volume}/${acc.daily_limit})`);
                });
            } else {
                console.log('No accounts directly owned by Andy');
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

debugAccounts();
