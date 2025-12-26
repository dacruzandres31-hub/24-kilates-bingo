const pool = require('./src/db');

async function checkSocketLogic() {
    try {
        const [users] = await pool.query('SELECT id FROM users WHERE username = ?', ['Eve27']);
        if (users.length === 0) process.exit(0);
        const userId = users[0].id;

        // Simulate query used only for emitting resources?
        // I need to find the specific query in the codebase first.
        // For now, I'll checking if there's a different query logic potentially used.

        // Maybe it queries 'daily_stock_cards' instead of 'user_card_inventory'?
        // Or maybe it filters is_gift=0?

        const [paidOnly] = await pool.query(`
      SELECT COUNT(*) as count FROM user_card_inventory 
      WHERE user_id = ? AND room = 'bronce' AND is_gift = 0
    `, [userId]);

        console.log(`Paid Bronce cards: ${paidOnly[0].count}`);

        process.exit(0);
    } catch (err) { console.error(err); }
}
checkSocketLogic();
