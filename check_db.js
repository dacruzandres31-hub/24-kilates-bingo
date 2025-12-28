const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
};

async function check() {
    const pool = mysql.createPool(config);
    try {
        const [gs] = await pool.query('DESCRIBE game_sessions');
        console.log('--- game_sessions ---');
        console.log(gs.map(r => r.Field));

        const [vc] = await pool.query('DESCRIBE validated_cards');
        console.log('--- validated_cards ---');
        console.log(vc.map(r => r.Field));

        const [cp] = await pool.query('DESCRIBE card_pool');
        console.log('--- card_pool ---');
        console.log(cp.map(r => r.Field));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
