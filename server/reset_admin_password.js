/**
 * Script simple para resetear la contraseña del usuario admin
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'bingo2024',
      database: 'bingo_24k'
    });

    console.log('✅ Conectado a la base de datos');

    // Buscar usuario admin
    const [users] = await connection.query(
      'SELECT id, username, role FROM users WHERE username = ?',
      ['admin']
    );

    if (users.length === 0) {
      console.log('❌ Usuario "admin" no encontrado');
      await connection.end();
      return;
    }

    const adminUser = users[0];
    console.log('✅ Usuario encontrado:', adminUser.username);
    console.log('   ID:', adminUser.id);
    console.log('   Rol:', adminUser.role);

    // Nueva contraseña
    const newPassword = 'Admin24K!2025';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, adminUser.id]
    );

    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   ✅ CONTRASEÑA ACTUALIZADA EXITOSAMENTE      ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║  Usuario:     admin                            ║');
    console.log('║  Contraseña:  Admin24K!2025                    ║');
    console.log('║  Rol:        ', adminUser.role.padEnd(31), '║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('🔐 Puedes iniciar sesión ahora con estas credenciales');
    console.log('');

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

resetAdminPassword();
