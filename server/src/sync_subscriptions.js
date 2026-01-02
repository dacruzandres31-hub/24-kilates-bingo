const mysql = require('mysql2/promise');

async function syncSubscriptions() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('✅ Conectado a MySQL\n');

        // Find users with subscription_tier_id but no user_subscriptions record
        console.log('📋 Buscando usuarios con subscription_tier_id sin suscripción formal...\n');

        const [usersWithoutSub] = await connection.query(`
      SELECT u.id, u.username, u.subscription_tier_id
      FROM users u
      WHERE u.subscription_tier_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_subscriptions us 
        WHERE us.user_id = u.id AND us.status = 'active'
      )
    `);

        if (usersWithoutSub.length === 0) {
            console.log('✅ Todos los usuarios con subscription_tier_id tienen suscripción formal');
            await connection.end();
            return;
        }

        console.log(`⚠️ Encontrados ${usersWithoutSub.length} usuarios sin suscripción formal:`);
        console.table(usersWithoutSub);

        console.log('\n🔧 Creando suscripciones faltantes...\n');

        for (const user of usersWithoutSub) {
            // Create subscription record
            const nextBillingDate = new Date();
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // 1 month from now

            await connection.query(`
        INSERT INTO user_subscriptions 
        (user_id, membership_id, status, start_date, next_billing_date, auto_renew)
        VALUES (?, ?, 'active', NOW(), ?, TRUE)
      `, [user.id, user.subscription_tier_id, nextBillingDate]);

            console.log(`✅ Creada suscripción para ${user.username} (Tier ID: ${user.subscription_tier_id})`);
        }

        console.log('\n✨ Sincronización completada!');
        console.log('\n📋 Verificando suscripciones creadas:');

        const [allSubs] = await connection.query(`
      SELECT 
        u.username,
        m.name as tier_name,
        us.status,
        us.next_billing_date
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN memberships m ON us.membership_id = m.id
      WHERE us.status = 'active'
    `);

        console.table(allSubs);

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        if (connection) await connection.end();
        process.exit(1);
    }
}

syncSubscriptions();
