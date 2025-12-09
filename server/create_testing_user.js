const db = require('./src/db');

async function createTestingUser() {
  try {
    await db.execute(`
      INSERT INTO users (id, username, password_hash, role, balance) 
      VALUES (999, 'testing_user', '$2b$10$dummyhash123456789012345678', 'jugador', 0) 
      ON DUPLICATE KEY UPDATE username='testing_user'
    `);
    
    console.log('✅ Usuario testing (ID 999) creado/actualizado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestingUser();
