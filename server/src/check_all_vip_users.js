const mysql = require('mysql2/promise');

async function checkAllVIPUsers() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('✅ Conectado a MySQL\n');

        // Check all users with subscription_tier_id
        console.log('📋 Usuarios con subscription_tier_id configurado:');
        const [users] = await connection.query(`
      SELECT id, username, subscription_tier_id, balance
      FROM users 
      WHERE subscription_tier_id IS NOT NULL
      ORDER BY id
    `);

        if (users.length > 0) {
            console.table(users);

            // For each user, check if they have a subscription record
            for (const user of users) {
                console.log(`\n📋 Suscripciones de ${user.username}:`);
                const [subs] = await connection.query(`
          SELECT us.*, m.name as tier_name
          FROM user_subscriptions us
          JOIN memberships m ON us.membership_id = m.id
          WHERE us.user_id = ?
        `, [user.id]);

                if (subs.length > 0) {
                    console.table(subs);
                } else {
                    console.log(`   ❌ No tiene registro en user_subscriptions`);
                    console.log(`   ⚠️ PROBLEMA: subscription_tier_id = ${user.subscription_tier_id} pero sin suscripción formal`);
                }
            }
        } else {
            console.log('❌ No hay usuarios con subscription_tier_id configurado');
        }

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

checkAllVIPUsers();
