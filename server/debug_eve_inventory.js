const pool = require('./src/db');

async function inspect() {
    try {
        // 1. Find User ID
        const [users] = await pool.query('SELECT id, username FROM users WHERE username = ?', ['Eve27']);
        if (users.length === 0) {
            console.log('User Eve27 not found');
            process.exit(0);
        }
        const userId = users[0].id;
        console.log(`User Eve27 ID: ${userId}`);

        // 2. Check Inventory
        const [inventory] = await pool.query(`
      SELECT id, room, quantity, is_gift, created_at 
      FROM user_card_inventory 
      WHERE user_id = ? AND room = 'bronce'
    `, [userId]);

        console.log('Raw Inventory for Bronce:', inventory);

        // 3. Calculate Totals
        const total = inventory.reduce((sum, item) => sum + item.quantity, 0);
        const totalPaid = inventory.filter(i => !i.is_gift).reduce((sum, item) => sum + item.quantity, 0);
        const totalGift = inventory.filter(i => i.is_gift).reduce((sum, item) => sum + item.quantity, 0);

        console.log('--- Summary ---');
        console.log(`Total Quantity: ${total}`);
        console.log(`Total Paid: ${totalPaid}`);
        console.log(`Total Gift (PLUS): ${totalGift}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
