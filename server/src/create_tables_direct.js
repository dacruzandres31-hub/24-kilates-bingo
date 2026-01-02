// Este script ejecuta el SQL directamente usando la conexión del servidor
require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function createTables() {
    let connection;
    try {
        // Conectar directamente con las credenciales
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bingo2024',
            database: 'bingo_24k'
        });

        console.log('✅ Conectado a MySQL\n');

        // Crear tabla memberships
        console.log('📋 Creando tabla memberships...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        benefits_config JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabla memberships creada\n');

        // Crear tabla user_subscriptions
        console.log('📋 Creando tabla user_subscriptions...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        membership_id INT NOT NULL,
        status ENUM('active', 'cancelled', 'expired') DEFAULT 'active',
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        next_billing_date TIMESTAMP,
        auto_renew BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_status (user_id, status)
      )
    `);
        console.log('✅ Tabla user_subscriptions creada\n');

        // Insertar tiers
        console.log('📋 Insertando tiers de membresía...');

        const tiers = [
            {
                name: 'Socio Bronce',
                price: 5000.00,
                config: JSON.stringify({
                    monthly_free_cards: 10,
                    free_cards_room: 'gold',
                    wheel_extra_spin: 'renewal',
                    chat_badge: 'bronze_animated'
                })
            },
            {
                name: 'Socio Plata',
                price: 10000.00,
                config: JSON.stringify({
                    monthly_free_cards: 20,
                    free_cards_room: 'gold',
                    bonus_buy_threshold: 20,
                    bonus_buy_reward: 2,
                    bonus_buy_room: 'same',
                    wheel_daily_spins: 1,
                    chat_badge: 'silver_animated'
                })
            },
            {
                name: 'Socio Oro',
                price: 20000.00,
                config: JSON.stringify({
                    monthly_free_cards: 50,
                    free_cards_room: 'gold',
                    bonus_buy_threshold: 20,
                    bonus_buy_reward: 4,
                    bonus_buy_room: 'same',
                    wheel_daily_spins: 2,
                    chat_badge: 'gold_animated'
                })
            }
        ];

        for (const tier of tiers) {
            const [existing] = await connection.query(
                'SELECT id FROM memberships WHERE name = ?',
                [tier.name]
            );

            if (existing.length === 0) {
                await connection.query(
                    'INSERT INTO memberships (name, price, benefits_config) VALUES (?, ?, ?)',
                    [tier.name, tier.price, tier.config]
                );
                console.log(`✅ Insertado: ${tier.name}`);
            } else {
                console.log(`ℹ️  Ya existe: ${tier.name}`);
            }
        }

        console.log('\n✨ ¡Tablas creadas exitosamente!');
        console.log('\nVerificando datos...');

        const [memberships] = await connection.query('SELECT id, name, price FROM memberships');
        console.table(memberships);

        await connection.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (connection) await connection.end();
        process.exit(1);
    }
}

createTables();
