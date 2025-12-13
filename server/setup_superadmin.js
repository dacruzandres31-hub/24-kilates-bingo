const mysql = require('mysql2/promise');

async function setupSuperAdmin() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });

  try {
    console.log('📊 Estado actual de usuarios:');
    const [currentUsers] = await connection.execute(
      'SELECT id, username, role, parent_id, balance FROM users ORDER BY id'
    );
    console.table(currentUsers);

    console.log('\n🔧 Configurando Andy como SuperAdmin...');
    
    // 1. Andy como SuperAdmin sin parent
    await connection.execute(
      "UPDATE users SET role = 'superadmin', parent_id = NULL WHERE username = 'Andy'"
    );
    console.log('✅ Andy configurado como SuperAdmin');

    // 2. Obtener ID de Andy
    const [andyResult] = await connection.execute(
      "SELECT id FROM users WHERE username = 'Andy'"
    );
    
    if (andyResult.length === 0) {
      console.log('❌ Usuario Andy no encontrado. Creándolo...');
      await connection.execute(
        `INSERT INTO users (username, password, role, parent_id, balance) 
         VALUES ('Andy', '$2b$10$samplehash', 'superadmin', NULL, 10000000)`
      );
      console.log('✅ Usuario Andy creado');
    }

    const andyId = andyResult[0]?.id || (await connection.execute("SELECT id FROM users WHERE username = 'Andy'"))[0][0].id;

    // 3. Cambiar admin a agente hijo de Andy
    await connection.execute(
      `UPDATE users SET role = 'agente', parent_id = ? WHERE username = 'admin'`,
      [andyId]
    );
    console.log('✅ admin cambiado a agente (hijo de Andy)');

    // 4. Obtener ID de admin
    const [adminResult] = await connection.execute(
      "SELECT id FROM users WHERE username = 'admin'"
    );
    const adminId = adminResult[0]?.id;

    if (adminId) {
      // 5. Mover todos los hijos de admin a Andy
      const [movedUsers] = await connection.execute(
        `UPDATE users SET parent_id = ? WHERE parent_id = ? AND username != 'admin'`,
        [andyId, adminId]
      );
      console.log(`✅ ${movedUsers.affectedRows} usuarios movidos de admin a Andy`);
    }

    // 6. Asignar recursos a Andy (solo balance)
    await connection.execute(
      `UPDATE users SET balance = 10000000 WHERE username = 'Andy'`
    );
    console.log('✅ Recursos asignados a Andy ($10,000,000)');

    console.log('\n📊 Nueva estructura:');
    const [finalUsers] = await connection.execute(`
      SELECT 
        u.id,
        u.username,
        u.role,
        u.parent_id,
        p.username as parent_username,
        u.balance
      FROM users u
      LEFT JOIN users p ON u.parent_id = p.id
      ORDER BY 
        CASE WHEN u.parent_id IS NULL THEN 0 ELSE 1 END,
        u.parent_id,
        u.username
    `);
    console.table(finalUsers);

    console.log('\n✅ Configuración completada exitosamente!');
    console.log('\n📝 Resumen:');
    console.log('   - Andy es ahora el único SuperAdmin (raíz del árbol)');
    console.log('   - admin es agente hijo de Andy');
    console.log('   - Todos los usuarios dependientes movidos a Andy');
    console.log('   - Andy tiene $10,000,000 de balance');
    console.log('\n💡 Ahora puedes iniciar sesión como Andy en el panel de administración');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

setupSuperAdmin();
