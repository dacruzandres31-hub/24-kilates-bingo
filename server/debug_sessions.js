const pool = require('./src/db');

async function debug() {
    try {
        console.log('--- Testing DB Connection ---');
        const [rows] = await pool.query('SELECT 1 as val');
        console.log('DB Connection:', rows[0].val === 1 ? 'OK' : 'FAIL');

        console.log('\n--- Room Settings ---');
        const [rooms] = await pool.query('SELECT * FROM room_settings');
        console.log(rooms);

        console.log('\n--- Schedule Settings ---');
        const [schedules] = await pool.query('SELECT * FROM schedule_settings');
        console.log('Count:', schedules.length);
        if (schedules.length > 0) console.log('First schedule:', schedules[0]);

        console.log('\n--- Active/Pending Game Sessions ---');
        const [sessions] = await pool.query(`
      SELECT id, room, status, jackpot_linea, jackpot_bingo, jackpot_pre40 
      FROM game_sessions 
      WHERE status IN ('active', 'pending')
    `);
        console.log(sessions);

        console.log('\n--- Testing Logic for "Bronce" ---');
        const room = 'bronce';
        const [activeSession] = await pool.query(`
          SELECT 
            id, room, start_time, status,
            jackpot_linea, jackpot_bingo, jackpot_pre40
          FROM game_sessions
          WHERE room = ? AND status IN ('active', 'pending')
          ORDER BY start_time DESC
          LIMIT 1
        `, [room]);
        console.log('Active Session Bronce:', activeSession);

        process.exit(0);
    } catch (err) {
        console.error('DEBUG ERROR:', err);
        process.exit(1);
    }
}

debug();
