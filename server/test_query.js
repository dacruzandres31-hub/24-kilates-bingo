const pool = require('./src/db');

const testQuery = async () => {
    try {
        const room = 'bronce';
        const [activeSession] = await pool.query(`
      SELECT 
        gs.id, gs.room, gs.start_time, gs.status,
        gs.jackpot_linea, gs.jackpot_bingo, gs.jackpot_pre40,
        gs.total_cards_validated, gs.total_paid_cards, gs.total_gift_cards,
        rs.card_price
      FROM game_sessions gs
      LEFT JOIN room_settings rs ON gs.room = rs.room
      WHERE gs.room = ? AND gs.status IN ('active', 'pending')
      ORDER BY gs.start_time DESC
      LIMIT 1
    `, [room]);

        console.log('Query result:', JSON.stringify(activeSession, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

testQuery();
