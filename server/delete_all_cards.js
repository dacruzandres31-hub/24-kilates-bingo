const mysql = require('mysql2/promise');
require('dotenv').config();

async function deleteAllCards() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'bingo_24k'
  });

  try {
    console.log('🗑️ Eliminando todos los cartones...');
    await connection.query('DELETE FROM card_pool');
    console.log('✅ Cartones eliminados');
    
    // Reset counter
    await connection.query('UPDATE global_card_counter SET counter = 0 WHERE id = 1');
    console.log('✅ Contador reseteado a 0');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

deleteAllCards();
