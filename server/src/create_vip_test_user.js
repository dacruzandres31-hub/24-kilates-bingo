const mysql = require('mysql2/promise');

async function createVIPTestUser() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('✅ Conectado a MySQL\n');

        // Create test user
        const username = 'VIPTest' + Date.now();
        const [userResult] = await connection.query(
            'INSERT INTO users (username, password, balance) VALUES (?, ?, ?)',
            [username, '$2b$10$dummy', 10000] // Dummy hash, balance 10000
        );

        const userId = userResult.insertId;
        console.log(`✅ Usuario creado: ${username} (ID: ${userId})`);

        // Get Oro membership ID
        const [oro] = await connection.query(
            'SELECT id FROM memberships WHERE name = ?',
            ['Socio Oro']
        );

        if (oro.length === 0) {
            console.log('❌ Membresía Oro no encontrada');
            await connection.end();
            return;
        }

        const membershipId = oro[0].id;

        // Create active subscription
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1);

        await connection.query(
            `INSERT INTO user_subscriptions 
       (user_id, membership_id, status, start_date, next_billing_date, auto_renew)
       VALUES (?, ?, 'active', NOW(), ?, TRUE)`,
            [userId, membershipId, nextBilling]
        );

        console.log(`✅ Suscripción Oro creada para ${username}`);

        // Update user's subscription_tier_id
        await connection.query(
            'UPDATE users SET subscription_tier_id = ? WHERE id = ?',
            [membershipId, userId]
        );

        console.log('\n📋 Usuario VIP de prueba creado:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: password (temporal)`);
        console.log(`   Tier: Socio Oro`);
        console.log(`   Balance: $10,000`);
        console.log(`   VIP Bonus: Compra 20 → Paga 16, recibe 20`);
        console.log('\n🧪 Para probar:');
        console.log('   1. Login con este usuario');
        console.log('   2. Ir a Pack Bingo Plus');
        console.log('   3. Seleccionar paquete "20 + 10 PLUS"');
        console.log('   4. Verificar que muestra: "¡Bonificación VIP! Pagas 16, recibes 20"');
        console.log('   5. Confirmar compra');
        console.log('   6. Verificar en BD: 16 cartones is_gift=false, 14 cartones is_gift=true (10 PLUS + 4 VIP)');

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

createVIPTestUser();
