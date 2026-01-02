const pool = require('../db');

async function fixAndyAccount() {
    try {
        console.log('=== FIXING ANDY\'S ACCOUNT FOR VIP PAYMENTS ===\n');

        // 1. Find Andy's user ID
        const [andyUser] = await pool.query(`
            SELECT id, username, role 
            FROM users 
            WHERE role = 'superadmin'
            LIMIT 1
        `);

        if (andyUser.length === 0) {
            console.error('❌ No superadmin user found!');
            process.exit(1);
        }

        const andyId = andyUser[0].id;
        console.log(`✅ Found Andy: ID=${andyId}, Username=${andyUser[0].username}`);

        // 2. Find Andy's active account
        const [andyAccounts] = await pool.query(`
            SELECT id, alias, bank_name, holder_name, is_active, owner_id
            FROM payment_accounts
            WHERE owner_id = ? AND is_active = TRUE
        `, [andyId]);

        if (andyAccounts.length === 0) {
            console.error('❌ Andy has no active accounts!');
            process.exit(1);
        }

        console.log(`\n✅ Found ${andyAccounts.length} active account(s) owned by Andy:`);
        andyAccounts.forEach(acc => {
            console.log(`  - ID: ${acc.id}, Alias: ${acc.alias}, Bank: ${acc.bank_name}`);
        });

        // 3. Update Andy's account to have owner_id = NULL (make it a system account)
        const accountToUpdate = andyAccounts[0];
        console.log(`\n🔧 Updating account ID ${accountToUpdate.id} to be a system account (owner_id = NULL)...`);

        await pool.query(`
            UPDATE payment_accounts 
            SET owner_id = NULL 
            WHERE id = ?
        `, [accountToUpdate.id]);

        console.log('✅ Account updated successfully!');
        console.log('\nNow VIP payments will use this account.');

        // 4. Delete the placeholder account I created earlier
        console.log('\n🗑️ Removing placeholder system account...');
        await pool.query(`
            DELETE FROM payment_accounts 
            WHERE alias = 'ADMIN.SISTEMA' AND holder_name = 'Andy Admin'
        `);
        console.log('✅ Placeholder removed.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

fixAndyAccount();
