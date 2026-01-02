const mysql = require('mysql2/promise');

async function checkEve27Resources() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('✅ Conectado a MySQL\n');

        // Get user data
        console.log('📋 Datos completos de Eve27:');
        const [user] = await connection.query(`
      SELECT id, username, balance, subscription_tier_id,
             monthly_free_cards_balance, daily_wheel_spins_balance, last_benefit_reset
      FROM users 
      WHERE username = 'Eve27'
    `);

        if (user.length === 0) {
            console.log('❌ Usuario Eve27 no encontrado');
            await connection.end();
            return;
        }

        console.table(user);
        const userId = user[0].id;

        // Get card inventory
        console.log('\n📋 Inventario de cartones de Eve27:');
        const [inventory] = await connection.query(`
      SELECT room, quantity, is_gift
      FROM user_card_inventory
      WHERE user_id = ?
      ORDER BY room, is_gift
    `, [userId]);

        if (inventory.length > 0) {
            console.table(inventory);
        } else {
            console.log('❌ No tiene cartones en inventario');
        }

        // Get subscription details
        console.log('\n📋 Suscripción activa de Eve27:');
        const [sub] = await connection.query(`
      SELECT us.*, m.name, m.price, m.benefits_config
      FROM user_subscriptions us
      JOIN memberships m ON us.membership_id = m.id
      WHERE us.user_id = ? AND us.status = 'active'
    `, [userId]);

        if (sub.length > 0) {
            console.table(sub);
            console.log('\n📋 Beneficios configurados:');
            console.log(JSON.parse(sub[0].benefits_config));
        }

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

checkEve27Resources();
