const mysql = require('mysql2/promise');

async function createUserCardsTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
  });

  try {
    console.log('Creando tabla user_cards...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        room ENUM('bronce', 'plata', 'oro') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_room (user_id, room)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Tabla user_cards creada exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

createUserCardsTable();
