/**
 * Script para crear el usuario SuperAdmin exclusivo
 * Este usuario será la raíz del árbol jerárquico y tendrá permisos especiales
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'bingo2024',
      database: 'bingo_24k'
    });

    console.log('✅ Conectado a la base de datos');

    // Verificar si ya existe un SuperAdmin
    const [existingSuperAdmin] = await connection.query(
      'SELECT id, username FROM users WHERE role = ? AND parent_id IS NULL',
      ['superadmin']
    );

    if (existingSuperAdmin.length > 0) {
      console.log('⚠️  Ya existe un SuperAdmin raíz:', existingSuperAdmin[0].username);
      console.log('ID:', existingSuperAdmin[0].id);
      
      // Preguntar si quiere resetear la contraseña
      const newPassword = 'Tasso2025';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await connection.query(
        'UPDATE users SET username = ?, password_hash = ? WHERE id = ?',
        ['Andy', hashedPassword, existingSuperAdmin[0].id]
      );
      
      console.log('✅ Usuario y contraseña actualizados exitosamente');
      console.log('👤 Usuario:', 'Andy');
      console.log('🔑 Contraseña:', newPassword);
      
      await connection.end();
      return;
    }

    // Crear el SuperAdmin
    const username = 'Andy';
    const password = 'Tasso2025';
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await connection.query(
      `INSERT INTO users (
        username, 
        password_hash, 
        role, 
        parent_id, 
        balance,
        can_process_payouts,
        nombre_completo,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [username, hashedPassword, 'superadmin', null, 0, true, 'Super Administrador - Sistema 24K']
    );

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║        ✨ SUPERADMIN CREADO EXITOSAMENTE ✨               ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  ID:          ', result.insertId.toString().padEnd(43), '║');
    console.log('║  Usuario:     ', username.padEnd(43), '║');
    console.log('║  Contraseña:  ', password.padEnd(43), '║');
    console.log('║  Rol:         ', 'superadmin'.padEnd(43), '║');
    console.log('║  Jerarquía:   ', 'RAÍZ (sin padre)'.padEnd(43), '║');
    console.log('║  Permisos:    ', 'TODOS (gestión completa del sistema)'.padEnd(43), '║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('🔐 IMPORTANTE: Cambia esta contraseña después del primer login');
    console.log('');

    // Crear configuración de precios inicial
    await connection.query(`
      CREATE TABLE IF NOT EXISTS card_prices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room ENUM('bronce', 'plata', 'oro', 'free_starter') NOT NULL,
        price DECIMAL(15, 2) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id),
        UNIQUE KEY unique_active_room (room, is_active)
      )
    `);

    // Insertar precios por defecto
    await connection.query(`
      INSERT INTO card_prices (room, price, is_active, updated_by) VALUES
      ('bronce', 1000.00, true, ?),
      ('plata', 5000.00, true, ?),
      ('oro', 10000.00, true, ?),
      ('free_starter', 0.00, true, ?)
      ON DUPLICATE KEY UPDATE price = VALUES(price)
    `, [result.insertId, result.insertId, result.insertId, result.insertId]);

    console.log('✅ Tabla de precios de cartones creada');
    console.log('✅ Precios por defecto configurados:');
    console.log('   - Bronce: $1,000');
    console.log('   - Plata: $5,000');
    console.log('   - Oro: $10,000');
    console.log('   - Free Starter: $0');
    console.log('');

    await connection.end();
    console.log('✅ Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

// Ejecutar
createSuperAdmin();
