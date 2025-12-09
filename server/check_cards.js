/**
 * Verificar cartones en BD
 */

const pool = require('./src/db');

async function checkCards() {
  try {
    const [cards] = await pool.query(`
      SELECT id, session_id, serial, 
             numbers IS NULL as numbers_is_null,
             LENGTH(numbers) as numbers_length,
             LEFT(numbers, 100) as numbers_sample
      FROM card_pool 
      WHERE session_id = 20
      LIMIT 10
    `);

    console.log('\n📊 Cartones en sesión 20:');
    console.log(JSON.stringify(cards, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCards();
