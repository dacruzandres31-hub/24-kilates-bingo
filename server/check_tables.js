const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo_24k'
  });
  
  const [cols] = await conn.query('SHOW COLUMNS FROM game_sessions');
  console.log('\ngame_sessions columns:');
  cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
  
  const [bingoCardsCols] = await conn.query('SHOW COLUMNS FROM bingo_cards');
  console.log('\nbingo_cards columns:');
  bingoCardsCols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
  
  await conn.end();
})();
