const pool = require('../db');

async function testPaymentRouting() {
    try {
        console.log('=== TESTING PAYMENT ROUTING LOGIC ===\n');

        // 1. Find Andy (SuperAdmin)
        const [andyUser] = await pool.query(`
            SELECT id, username, role 
            FROM users 
            WHERE role = 'superadmin'
            LIMIT 1
        `);

        if (andyUser.length === 0) {
            console.error('❌ No superadmin found!');
            process.exit(1);
        }

        const andyId = andyUser[0].id;
        console.log(`✅ Andy: ID=${andyId}, Username=${andyUser[0].username}\n`);

        // 2. Find all direct children of Andy
        const [directChildren] = await pool.query(`
            SELECT id, username, role, parent_id
            FROM users
            WHERE parent_id = ?
        `, [andyId]);

        console.log(`📋 Direct children of Andy: ${directChildren.length}\n`);

        if (directChildren.length === 0) {
            console.log('⚠️ No direct children found. Create some users under Andy to test.');
        } else {
            directChildren.forEach(user => {
                console.log(`  - ${user.username} (${user.role})`);
            });
        }

        // 3. Show system accounts that will be used
        console.log('\n=== SYSTEM ACCOUNTS (Used by Andy\'s children) ===\n');
        const [systemAccounts] = await pool.query(`
            SELECT id, alias, bank_name, is_active, current_daily_volume, daily_limit
            FROM payment_accounts
            WHERE owner_id IS NULL AND is_active = TRUE
            ORDER BY current_daily_volume ASC
        `);

        if (systemAccounts.length === 0) {
            console.log('❌ No active system accounts found!');
        } else {
            console.log(`Total: ${systemAccounts.length} active account(s)\n`);
            systemAccounts.forEach((acc, idx) => {
                const available = acc.current_daily_volume < acc.daily_limit;
                console.log(`${idx + 1}. ${acc.alias} (${acc.bank_name})`);
                console.log(`   Volumen: ${acc.current_daily_volume}/${acc.daily_limit} COP`);
                console.log(`   Disponible: ${available ? '✅ SÍ' : '❌ NO'}\n`);
            });
        }

        // 4. Show routing logic summary
        console.log('=== ROUTING LOGIC SUMMARY ===\n');
        console.log('1. VIP Memberships → System Accounts (owner_id = NULL)');
        console.log('2. Andy\'s Direct Children → System Accounts (owner_id = NULL)');
        console.log('3. Other Users → Parent\'s Personal Accounts (owner_id = parent_id)');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

testPaymentRouting();
