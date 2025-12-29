const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testPassword() {
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
            `SELECT id, username, password_hash FROM users WHERE username = 'Andy'`
        );

        if (users.length === 0) {
            console.log('❌ Usuario Andy NO encontrado');
            return;
        }

        const andy = users[0];
        console.log('✅ Usuario Andy encontrado');
        console.log('   ID:', andy.id);
        console.log('   Username:', andy.username);

        // Probar contraseña
        const testPassword = '123456';
        const isMatch = await bcrypt.compare(testPassword, andy.password_hash);

        if (isMatch) {
            console.log('✅ ¡La contraseña "123456" es CORRECTA!');
        } else {
            console.log('❌ La contraseña "123456" NO coincide');
            console.log('   Hash en DB:', andy.password_hash);
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

testPassword();
