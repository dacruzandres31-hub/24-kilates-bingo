const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetAndyPassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });

  try {
    console.log('🔑 Reseteando contraseña de Andy...');
    
    const newPassword = 'andy2024';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [hashedPassword, 'Andy']
    );
    
    console.log('✅ Contraseña actualizada exitosamente');
    console.log('   Usuario: Andy');
    console.log('   Nueva contraseña: andy2024');
    console.log('   Hash generado:', hashedPassword.substring(0, 20) + '...');
    
    // Verificar login
    const [users] = await connection.execute(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      ['Andy']
    );
    
    if (users.length > 0) {
      const user = users[0];
      const isValid = await bcrypt.compare(newPassword, user.password_hash);
      console.log('\n🧪 Verificación:');
      console.log('   ¿Password coincide?', isValid ? '✅ SÍ' : '❌ NO');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

resetAndyPassword();
