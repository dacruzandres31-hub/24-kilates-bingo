const mysql = require('mysql2/promise');

async function checkStatus() {
    const config = {
        host: 'localhost',
        user: 'root',
        password: 'bingo2024',
        database: 'bingo_24k'
    };

    const connection = await mysql.createConnection(config);
    try {
        const [sessions] = await connection.query('SELECT id, room, status, jackpot_linea, jackpot_bingo FROM game_sessions WHERE status != "completed"');
        console.log('--- Sesiones Activas/Pendientes ---');
        console.log(sessions);

        if (sessions.length > 0) {
            const sid = sessions[0].id;
            const [cards] = await connection.query('SELECT count(*) as total FROM validated_cards WHERE game_session_id = ?', [sid]);
            console.log(`Cartones validados para sesión ${sid}: ${cards[0].total}`);

            const [balls] = await connection.query('SELECT count(*) as total FROM game_session_balls WHERE game_session_id = ?', [sid]);
            console.log(`Bolas ya cantadas en sesión ${sid}: ${balls[0].total}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkStatus();
