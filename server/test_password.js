// Verificar hash de contraseña
const bcrypt = require('bcryptjs');

const password = 'superadmin123';
const hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

console.log('Testing password:', password);
console.log('Against hash:', hash);

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Match result:', result);
    if (result) {
      console.log('✅ Password matches!');
    } else {
      console.log('❌ Password does NOT match!');
      console.log('\nGenerating correct hash...');
      
      bcrypt.hash(password, 10, (err, newHash) => {
        if (err) {
          console.error('Error generating hash:', err);
        } else {
          console.log('New hash for "superadmin123":', newHash);
          console.log('\nSQL to update:');
          console.log(`UPDATE users SET password_hash = '${newHash}' WHERE username = 'superadmin';`);
        }
      });
    }
  }
});
