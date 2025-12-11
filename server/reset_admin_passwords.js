// Regenerar usuarios con contraseñas correctas
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetAdminPasswords() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bingo_24k'
    });

    console.log('✅ Conectado a MySQL\n');

    // Generar hash para admin123
    const hash1 = await bcrypt.hash('admin123', 10);
    console.log('Hash generado para "admin123":', hash1);

    // Generar hash para superadmin123
    const hash2 = await bcrypt.hash('superadmin123', 10);
    console.log('Hash generado para "superadmin123":', hash2);

    console.log('\n========================================');
    console.log('Actualizando contraseñas...');
    console.log('========================================\n');

    // Actualizar usuario admin
    await connection.execute(
      `UPDATE users SET password_hash = ? WHERE username = 'admin'`,
      [hash1]
    );
    console.log('✅ Contraseña actualizada para: admin');

    // Actualizar usuario superadmin
    await connection.execute(
      `UPDATE users SET password_hash = ? WHERE username = 'superadmin'`,
      [hash2]
    );
    console.log('✅ Contraseña actualizada para: superadmin');

    // Verificar
    const [users] = await connection.execute(
      'SELECT id, username, role, balance FROM users WHERE role = ?',
      ['superadmin']
    );

    console.log('\n========================================');
    console.log('Usuarios SuperAdmin actualizados:');
    console.log('========================================');
    console.table(users);

    console.log('\n🎉 ¡Contraseñas actualizadas correctamente!');
    console.log('\nCredenciales de acceso:');
    console.log('- admin / admin123');
    console.log('- superadmin / superadmin123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

resetAdminPasswords();
