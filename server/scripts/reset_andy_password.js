const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetAndyPassword() {
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

        // Hash de la nueva contraseña
        const newPassword = '123456';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar contraseña de Andy
        const [result] = await conn.query(
            `UPDATE users SET password_hash = ? WHERE username = 'Andy'`,
            [hashedPassword]
        );

        if (result.affectedRows > 0) {
            console.log('✅ Contraseña de Andy reseteada exitosamente');
            console.log('📝 Usuario: Andy');
            console.log('📝 Contraseña: 123456');
        } else {
            console.log('⚠️ No se encontró el usuario Andy');
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

resetAndyPassword();
