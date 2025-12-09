const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanOldCards() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'bingo_24k'
  });

  try {
    console.log('🧹 Limpiando cartones con seriales antiguos...');

    // Contar cartones antes
    const [before] = await connection.query('SELECT COUNT(*) as count FROM card_pool');
    console.log(`📊 Cartones actuales: ${before[0].count}`);

    // Eliminar cartones con formato viejo (DDMMYY-SXXXX)
    const [result] = await connection.query(`
      DELETE FROM card_pool 
      WHERE serial NOT LIKE '24K-%'
    `);

    console.log(`✅ ${result.affectedRows} cartones eliminados`);

    // Contar después
    const [after] = await connection.query('SELECT COUNT(*) as count FROM card_pool');
    console.log(`📊 Cartones restantes: ${after[0].count}`);

    // Mostrar ejemplos de seriales
    const [examples] = await connection.query('SELECT serial FROM card_pool LIMIT 5');
    console.log('📝 Ejemplos de seriales:');
    examples.forEach(row => console.log(`  - ${row.serial}`));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

cleanOldCards();
