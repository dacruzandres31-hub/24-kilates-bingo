const pool = require('./src/db');
async function run() {
    const [r] = await pool.query("INSERT INTO game_sessions (room, status, start_time, cost, jackpot_linea, jackpot_bingo, jackpot_pre40, created_at) VALUES ('bronce', 'pending', DATE_ADD(NOW(), INTERVAL 1 HOUR), 500, 1000, 5000, 150000, NOW())");
    console.log('ID:', r.insertId);
    process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
