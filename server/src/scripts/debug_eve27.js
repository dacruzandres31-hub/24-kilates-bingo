const pool = require('../db');

async function debugEve27() {
    try {
        console.log('=== DEBUGGING EVE27 PAYMENT ISSUE ===\n');

        // 1. Find Eve27
        const [eve27] = await pool.query(`
            SELECT id, username, role, parent_id
            FROM users
            WHERE username = 'Eve27'
        `);

        if (eve27.length === 0) {
            console.error('❌ User Eve27 not found!');
            process.exit(1);
        }

        const user = eve27[0];
        console.log(`✅ User Found:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Parent ID: ${user.parent_id}\n`);

        // 2. Check parent
        if (user.parent_id) {
            const [parent] = await pool.query(`
                SELECT id, username, role
                FROM users
                WHERE id = ?
            `, [user.parent_id]);

            if (parent.length > 0) {
                console.log(`👤 Parent:`);
                console.log(`   ID: ${parent[0].id}`);
                console.log(`   Username: ${parent[0].username}`);
                console.log(`   Role: ${parent[0].role}\n`);

                // 3. Check what accounts should be used
                if (parent[0].role === 'superadmin') {
                    console.log('📋 Expected Routing: SYSTEM ACCOUNTS (owner_id = NULL)\n');

                    const [systemAccounts] = await pool.query(`
                        SELECT id, alias, bank_name, is_active, current_daily_volume, daily_limit
                        FROM payment_accounts
                        WHERE owner_id IS NULL
                    `);

                    console.log(`System Accounts Found: ${systemAccounts.length}\n`);
                    systemAccounts.forEach(acc => {
                        const available = acc.is_active && acc.current_daily_volume < acc.daily_limit;
                        console.log(`  - ${acc.alias} (${acc.bank_name})`);
                        console.log(`    Active: ${acc.is_active ? 'YES' : 'NO'}`);
                        console.log(`    Volume: ${acc.current_daily_volume}/${acc.daily_limit}`);
                        console.log(`    Available: ${available ? '✅ YES' : '❌ NO'}\n`);
                    });
                } else {
                    console.log(`📋 Expected Routing: PARENT'S ACCOUNTS (owner_id = ${parent[0].id})\n`);

                    const [parentAccounts] = await pool.query(`
                        SELECT id, alias, bank_name, is_active, current_daily_volume, daily_limit
                        FROM payment_accounts
                        WHERE owner_id = ?
                    `, [parent[0].id]);

                    console.log(`Parent's Accounts Found: ${parentAccounts.length}\n`);
                    if (parentAccounts.length === 0) {
                        console.log('❌ Parent has no accounts configured!');
                    } else {
                        parentAccounts.forEach(acc => {
                            const available = acc.is_active && acc.current_daily_volume < acc.daily_limit;
                            console.log(`  - ${acc.alias} (${acc.bank_name})`);
                            console.log(`    Active: ${acc.is_active ? 'YES' : 'NO'}`);
                            console.log(`    Volume: ${acc.current_daily_volume}/${acc.daily_limit}`);
                            console.log(`    Available: ${available ? '✅ YES' : '❌ NO'}\n`);
                        });
                    }
                }
            }
        } else {
            console.log('⚠️ User has no parent assigned!\n');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

debugEve27();
