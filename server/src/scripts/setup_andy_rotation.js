const pool = require('../db');

async function setupAndyAccountsForRotation() {
    try {
        console.log('=== CONFIGURANDO CUENTAS DE ANDY PARA ROTACIÓN VIP ===\n');

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
        console.log(`✅ Andy encontrado: ID=${andyId}, Username=${andyUser[0].username}\n`);

        // 2. Find ALL accounts owned by Andy
        const [andyAccounts] = await pool.query(`
            SELECT id, alias, bank_name, holder_name, is_active, owner_id, current_daily_volume, daily_limit
            FROM payment_accounts
            WHERE owner_id = ?
        `, [andyId]);

        if (andyAccounts.length === 0) {
            console.log('✅ Andy no tiene cuentas con owner_id asignado (ya están como sistema)');
        } else {
            console.log(`📋 Encontradas ${andyAccounts.length} cuenta(s) de Andy que necesitan convertirse a sistema:\n`);

            for (const acc of andyAccounts) {
                console.log(`  - ID: ${acc.id}, Alias: ${acc.alias}, Banco: ${acc.bank_name}`);
                console.log(`    Activa: ${acc.is_active ? 'SÍ' : 'NO'}, Volumen: ${acc.current_daily_volume}/${acc.daily_limit}`);
            }

            // 3. Convert ALL Andy's accounts to system accounts (owner_id = NULL)
            console.log(`\n🔧 Convirtiendo TODAS las cuentas de Andy a cuentas de sistema...`);

            const [result] = await pool.query(`
                UPDATE payment_accounts 
                SET owner_id = NULL 
                WHERE owner_id = ?
            `, [andyId]);

            console.log(`✅ ${result.affectedRows} cuenta(s) convertida(s) a sistema (owner_id = NULL)`);
        }

        // 4. Show all system accounts now
        console.log('\n=== CUENTAS DE SISTEMA DISPONIBLES PARA VIP (Rotación) ===\n');
        const [systemAccounts] = await pool.query(`
            SELECT id, alias, bank_name, holder_name, is_active, current_daily_volume, daily_limit
            FROM payment_accounts
            WHERE owner_id IS NULL
            ORDER BY current_daily_volume ASC
        `);

        if (systemAccounts.length === 0) {
            console.log('❌ No hay cuentas de sistema configuradas');
        } else {
            console.log(`Total: ${systemAccounts.length} cuenta(s)\n`);
            systemAccounts.forEach((acc, idx) => {
                const available = acc.is_active && acc.current_daily_volume < acc.daily_limit;
                console.log(`${idx + 1}. ${acc.alias} (${acc.bank_name})`);
                console.log(`   Estado: ${acc.is_active ? '✅ Activa' : '❌ Inactiva'}`);
                console.log(`   Volumen: ${acc.current_daily_volume}/${acc.daily_limit} COP`);
                console.log(`   Disponible: ${available ? '✅ SÍ' : '❌ NO (límite alcanzado)'}`);
                console.log('');
            });
        }

        console.log('\n💡 IMPORTANTE:');
        console.log('   - Todas las cuentas con owner_id = NULL rotarán automáticamente');
        console.log('   - El sistema elige la cuenta con MENOR volumen diario');
        console.log('   - Cuando una cuenta alcance su límite, pasa a la siguiente');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

setupAndyAccountsForRotation();
