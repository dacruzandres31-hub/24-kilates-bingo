const pool = require('./db');

async function checkAndCreateTables() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ Conectado a la base de datos\n');

        // Check memberships table
        console.log('📋 Verificando tabla "memberships"...');
        const [memberships] = await connection.query("SHOW TABLES LIKE 'memberships'");

        if (memberships.length > 0) {
            console.log('✅ Tabla "memberships" existe');
            const [data] = await connection.query('SELECT id, name, price FROM memberships');
            console.table(data);
        } else {
            console.log('❌ Tabla "memberships" NO existe');
            console.log('Ejecutando script de inicialización...\n');

            // Run init script
            const initScript = require('./scripts/init_membership_db');
            return; // init script will handle everything
        }

        // Check user_subscriptions table
        console.log('\n📋 Verificando tabla "user_subscriptions"...');
        const [subs] = await connection.query("SHOW TABLES LIKE 'user_subscriptions'");

        if (subs.length > 0) {
            console.log('✅ Tabla "user_subscriptions" existe');
            const [count] = await connection.query('SELECT COUNT(*) as total FROM user_subscriptions');
            console.log(`Total de suscripciones: ${count[0].total}`);

            if (count[0].total > 0) {
                const [sample] = await connection.query('SELECT * FROM user_subscriptions LIMIT 3');
                console.table(sample);
            }
        } else {
            console.log('❌ Tabla "user_subscriptions" NO existe');
        }

        connection.release();

        if (memberships.length > 0 && subs.length > 0) {
            console.log('\n✅ Todas las tablas existen. Puedes activar las consultas reales en el endpoint.');
        } else {
            console.log('\n⚠️ Faltan tablas. Ejecuta: node scripts/init_membership_db.js');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (connection) connection.release();
        process.exit(1);
    }
}

checkAndCreateTables();
