const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAllAdmins() {
    let conn;
    try {
        console.log('🔐 Conectando a la base de datos...\n');

        conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'bingo2024',
            database: process.env.DB_NAME || 'bingo_24k'
        });

        console.log('✅ Conectado a la base de datos\n');

        // Buscar todos los usuarios admin/superadmin
        const [users] = await conn.query(
            `SELECT id, username, role FROM users WHERE role IN ('admin', 'superadmin', 'agente') ORDER BY id`
        );

        console.log('👥 Usuarios con permisos administrativos:\n');
        users.forEach(user => {
            const icon = user.role === 'superadmin' ? '👑' : user.role === 'admin' ? '🔧' : '🏢';
            console.log(`${icon} ID: ${user.id} | Username: ${user.username} | Role: ${user.role}`);
        });

        console.log('\n📊 Total:', users.length, 'usuarios');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (conn) {
            await conn.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

checkAllAdmins();
