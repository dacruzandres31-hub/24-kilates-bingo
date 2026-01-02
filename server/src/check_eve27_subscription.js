const mysql = require('mysql2/promise');

async function checkEve27Subscription() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('✅ Conectado a MySQL\n');

        // Check user data
        console.log('📋 Datos del usuario Eve27:');
        const [user] = await connection.query(`
      SELECT id, username, subscription_tier_id, monthly_free_cards_balance, 
             daily_wheel_spins_balance, last_benefit_reset
      FROM users 
      WHERE username = 'Eve27'
    `);
        console.table(user);

        if (user.length === 0) {
            console.log('❌ Usuario Eve27 no encontrado');
            await connection.end();
            return;
        }

        const userId = user[0].id;

        // Check subscription data
        console.log('\n📋 Suscripciones de Eve27:');
        const [subscriptions] = await connection.query(`
      SELECT us.*, m.name as tier_name, m.price
      FROM user_subscriptions us
      JOIN memberships m ON us.membership_id = m.id
      WHERE us.user_id = ?
      ORDER BY us.created_at DESC
    `, [userId]);

        if (subscriptions.length > 0) {
            console.table(subscriptions);
        } else {
            console.log('❌ No hay registros en user_subscriptions para Eve27');
            console.log('\n⚠️ PROBLEMA: El usuario tiene subscription_tier_id pero no hay registro en user_subscriptions');
            console.log('Esto significa que solo se actualizó la columna en users pero no se creó la suscripción formal.');
        }

        // Check what the API would return
        console.log('\n📋 Lo que el endpoint /api/memberships/my-subscription debería retornar:');
        const [apiResult] = await connection.query(`
      SELECT 
        us.id as subscription_id,
        us.status,
        us.start_date,
        us.next_billing_date,
        us.auto_renew,
        m.id as membership_id,
        m.name as tier_name,
        m.price,
        m.benefits_config
      FROM user_subscriptions us
      JOIN memberships m ON us.membership_id = m.id
      WHERE us.user_id = ? AND us.status = 'active'
      LIMIT 1
    `, [userId]);

        if (apiResult.length > 0) {
            console.log('✅ Suscripción activa encontrada:');
            console.table(apiResult);
        } else {
            console.log('❌ No se encontró suscripción activa');
            console.log('\n💡 SOLUCIÓN: Necesitas crear un registro en user_subscriptions para Eve27');
        }

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

checkEve27Subscription();
