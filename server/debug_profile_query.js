const pool = require('./src/db');

async function checkProfile() {
    try {
        const [users] = await pool.query('SELECT id, username FROM users WHERE username = ?', ['Eve27']);
        if (users.length === 0) {
            console.log('User Eve27 not found');
            process.exit(0);
        }
        const userId = users[0].id;

        console.log(`Checking inventory for User ID: ${userId}`);

        // Exact query from userController.js
        const [inventory] = await pool.query(
            `SELECT 
        COALESCE(SUM(CASE WHEN room = 'bronce' THEN quantity ELSE 0 END), 0) as bronze,
        COALESCE(SUM(CASE WHEN room = 'plata' THEN quantity ELSE 0 END), 0) as silver,
        COALESCE(SUM(CASE WHEN room = 'oro' THEN quantity ELSE 0 END), 0) as gold
       FROM user_card_inventory
       WHERE user_id = ?`,
            [userId]
        );

        console.log('--- getUserProfile Result ---');
        console.log(inventory[0]);

        // Check for mixed room names
        const [rawRooms] = await pool.query(
            `SELECT room, SUM(quantity) as qty 
       FROM user_card_inventory 
       WHERE user_id = ? 
       GROUP BY room`,
            [userId]
        );
        console.log('--- Raw Room Breakdown ---');
        console.log(rawRooms);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProfile();
