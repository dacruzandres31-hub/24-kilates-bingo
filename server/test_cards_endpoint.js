/**
 * Test rápido del endpoint de cartones
 */

const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

async function testCardsEndpoint() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });

  try {
    // 1. Verificar cartones en BD
    const [cards] = await connection.query(`
      SELECT COUNT(*) as count, session_id 
      FROM card_pool 
      WHERE session_id = 'starter_default'
    `);
    
    console.log(`\n📊 Cartones en BD: ${cards[0].count}`);
    
    // 2. Verificar usuario 999
    const [users] = await connection.query('SELECT id, username, role FROM users WHERE id = 999');
    
    if (users.length === 0) {
      console.log('⚠️  Usuario 999 no existe, creándolo...');
      await connection.query(`
        INSERT INTO users (id, username, email, password_hash, role, balance, active)
        VALUES (999, 'test_user', 'test@test.com', '$2b$10$dummyhash', 'superadmin', 10000, 1)
        ON DUPLICATE KEY UPDATE active = 1
      `);
      console.log('✅ Usuario 999 creado');
    } else {
      console.log(`✅ Usuario encontrado: ${users[0].username} (${users[0].role})`);
    }
    
    // 3. Generar token JWT
    const JWT_SECRET = 'tu_clave_secreta_muy_segura_12345'; // Debe coincidir con .env
    const token = jwt.sign(
      { userId: 999, role: 'superadmin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log(`\n🔑 Token generado:`);
    console.log(token);
    
    console.log(`\n📋 Para probar en navegador, ejecuta en la consola:`);
    console.log(`localStorage.setItem('token', '${token}')`);
    console.log(`localStorage.setItem('user', '${JSON.stringify({id: 999, username: 'test_user', role: 'superadmin'})}')`);
    console.log(`\nLuego recarga la página (F5)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

testCardsEndpoint();
