// Script para crear usuarios SuperAdmin
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createSuperAdmins() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bingo_24k'
    });

    console.log('✅ Conectado a MySQL');
    console.log('========================================');
    console.log('Creando usuarios SuperAdmin');
    console.log('========================================\n');

    // Usuario 1: admin / admin123
    const hash1 = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.UDWnJ7rqlcwQNrWKGRpHJl9hYEqNJzC';
    await connection.execute(`
      INSERT INTO users (username, password_hash, role, balance, can_process_payouts) 
      VALUES (?, ?, 'superadmin', 1000000.00, TRUE)
      ON DUPLICATE KEY UPDATE 
        password_hash = ?,
        role = 'superadmin',
        can_process_payouts = TRUE
    `, ['admin', hash1, hash1]);
    
    console.log('✅ Usuario creado: admin / admin123');

    // Usuario 2: superadmin / superadmin123
    const hash2 = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    await connection.execute(`
      INSERT INTO users (username, password_hash, role, balance, can_process_payouts) 
      VALUES (?, ?, 'superadmin', 5000000.00, TRUE)
      ON DUPLICATE KEY UPDATE 
        password_hash = ?,
        role = 'superadmin',
        can_process_payouts = TRUE
    `, ['superadmin', hash2, hash2]);
    
    console.log('✅ Usuario creado: superadmin / superadmin123');

    // Verificar usuarios creados
    const [users] = await connection.execute(
      'SELECT id, username, role, balance, can_process_payouts FROM users WHERE role = ?',
      ['superadmin']
    );

    console.log('\n========================================');
    console.log('Usuarios SuperAdmin en la base de datos:');
    console.log('========================================');
    console.table(users);

    console.log('\n🎉 ¡Usuarios creados exitosamente!');
    console.log('\nPuedes usar cualquiera de estos para login:');
    console.log('- admin / admin123');
    console.log('- superadmin / superadmin123');
    console.log('\nAccede al panel en: http://localhost:5174');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createSuperAdmins();
