const pool = require('./src/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "UPDATE users SET password_hash = ? WHERE username = 'Andy'",
      [hashedPassword]
    );

    console.log('Password reset result:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetPassword();
