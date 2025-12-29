const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAndy() {
    let conn;
    try {
        console.log('🔐 Conectando a la base de datos...');

        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'bingo2024',
            database: process.env.DB_NAME || 'bingo_24k'
        });

        console.log('✅ Conectado a la base de datos');

        // Buscar usuario Andy
        const [users] = await conn.query(
            `SELECT id, username, role, password_hash FROM users WHERE username = 'Andy'`
        );

        if (users.length === 0) {
            console.log('❌ Usuario Andy NO encontrado');
        } else {
            const andy = users[0];
            console.log('✅ Usuario Andy encontrado:');
            console.log('   ID:', andy.id);
            console.log('   Username:', andy.username);
            console.log('   Role:', andy.role);
            console.log('   Password Hash:', andy.password_hash ? andy.password_hash.substring(0, 20) + '...' : 'NULL');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (conn) {
            await conn.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

checkAndy();
