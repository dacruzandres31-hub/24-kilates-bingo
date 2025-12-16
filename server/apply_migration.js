const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'bingo2024',
      database: 'bingo_24k'
    });

    console.log('🔄 Aplicando migración...');
    
    await conn.query(`
      ALTER TABLE bingo_cards_pool 
      MODIFY COLUMN status ENUM('available', 'reserved', 'selected', 'used', 'expired') 
      NOT NULL DEFAULT 'available'
    `);

    console.log('✅ Migración aplicada: status ahora acepta "reserved"');

    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
