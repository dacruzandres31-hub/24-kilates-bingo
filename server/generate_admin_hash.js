// Script para generar hash de password para superadmin
// Uso: node generate_admin_hash.js tu_password

const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generando hash:', err);
    return;
  }

  console.log('\n========================================');
  console.log('PASSWORD HASH GENERADO');
  console.log('========================================');
  console.log('Password original:', password);
  console.log('Hash bcrypt:', hash);
  console.log('\n');
  console.log('SQL para insertar usuario:');
  console.log('----------------------------------------');
  console.log(`INSERT INTO users (username, password_hash, role, balance, can_process_payouts)`);
  console.log(`VALUES ('tu_usuario', '${hash}', 'superadmin', 1000000.00, TRUE)`);
  console.log(`ON DUPLICATE KEY UPDATE password_hash = '${hash}';`);
  console.log('========================================\n');
});
