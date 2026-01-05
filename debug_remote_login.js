const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    console.log('Connecting to DB...');
    const pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'bingo_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'bingo_24k'
    });
    
    console.log('Pool creado, buscando usuario admin...');
    
    const [rows] = await pool.query('SELECT id, username, role, password_hash FROM users WHERE username = ?', ['admin']);
    console.log('Query result:', rows.length, 'rows');
    
    if (rows.length > 0) {
      const user = rows[0];
      console.log('User:', { id: user.id, username: user.username, role: user.role });
      console.log('Hash starts with:', user.password_hash.substring(0, 20));
      
      const match = await bcrypt.compare('Admin123!', user.password_hash);
      console.log('Password "Admin123!" match:', match);
    } else {
      console.log('No admin user found!');
    }
    
    await pool.end();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
