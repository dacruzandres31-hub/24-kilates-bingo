const pool = require('../src/db');
(async () => {
    const [cols] = await pool.query('DESCRIBE game_winners');
    console.log(cols.find(c => c.Field === "card_id"));
    process.exit(0);
})();
