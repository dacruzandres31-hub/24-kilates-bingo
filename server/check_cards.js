const pool = require('./src/db');

async function checkCards() {
  try {
    const [rows] = await pool.query(`
      SELECT user_id, status, COUNT(*) as count 
      FROM bingo_cards_pool 
      WHERE game_session_id = 59 
      GROUP BY user_id, status
    `);

    console.log('Cartones en bingo_cards_pool para sesión 59:');
    rows.forEach(r => {
      console.log(`  User ${r.user_id}, status: ${r.status}, count: ${r.count}`);
    });

    if (rows.length === 0) {
      console.log('  (ninguno)');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCards();
