const mysql = require('mysql2/promise');

async function showCredentials() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });
  
  const [users] = await conn.execute(
    'SELECT username, role FROM users WHERE role = "superadmin" OR username = "admin"'
  );
  
  console.log('\n📋 Credenciales de acceso:\n');
  console.table(users);
  console.log('\n🔑 Contraseñas por defecto:');
  console.log('   - Andy: andy2024');
  console.log('   - admin: admin123\n');
  
  await conn.end();
}

showCredentials().catch(console.error);
