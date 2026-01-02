const mysql = require('mysql2/promise');

async function deactivateAllMemberships() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('✅ Conectado a MySQL\n');

        // Check current active subscriptions
        console.log('📋 Suscripciones activas actuales:');
        const [activeSubs] = await connection.query(`
      SELECT 
        u.username,
        m.name as tier_name,
        us.status,
        us.start_date,
        us.next_billing_date
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      JOIN memberships m ON us.membership_id = m.id
      WHERE us.status = 'active'
    `);

        if (activeSubs.length === 0) {
            console.log('✅ No hay suscripciones activas');
            await connection.end();
            return;
        }

        console.table(activeSubs);
        console.log(`\n⚠️ Se encontraron ${activeSubs.length} suscripciones activas\n`);

        // Deactivate all subscriptions
        console.log('🔧 Desactivando todas las suscripciones...\n');

        const [result] = await connection.query(`
      UPDATE user_subscriptions 
      SET status = 'cancelled', auto_renew = FALSE
      WHERE status = 'active'
    `);

        console.log(`✅ ${result.affectedRows} suscripciones desactivadas`);

        // Clear subscription_tier_id from users table
        console.log('\n🔧 Limpiando subscription_tier_id de la tabla users...\n');

        const [userResult] = await connection.query(`
      UPDATE users 
      SET subscription_tier_id = NULL,
          monthly_free_cards_balance = 0,
          daily_wheel_spins_balance = 0,
          last_benefit_reset = NULL
      WHERE subscription_tier_id IS NOT NULL
    `);

        console.log(`✅ ${userResult.affectedRows} usuarios actualizados`);

        // Verify
        console.log('\n📋 Verificando estado final:');
        const [finalCheck] = await connection.query(`
      SELECT COUNT(*) as active_count
      FROM user_subscriptions
      WHERE status = 'active'
    `);

        console.log(`Suscripciones activas restantes: ${finalCheck[0].active_count}`);

        const [userCheck] = await connection.query(`
      SELECT COUNT(*) as users_with_tier
      FROM users
      WHERE subscription_tier_id IS NOT NULL
    `);

        console.log(`Usuarios con subscription_tier_id: ${userCheck[0].users_with_tier}`);

        console.log('\n✨ Limpieza completada! Ahora puedes modificar los beneficios de las membresías.');

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        if (connection) await connection.end();
        process.exit(1);
    }
}

deactivateAllMemberships();
