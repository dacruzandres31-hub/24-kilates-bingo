const pool = require('./src/db');

async function checkEve27Inventory() {
    try {
        // Buscar ID de Eve27
        const [users] = await pool.query('SELECT id FROM users WHERE username = ?', ['Eve27']);

        if (users.length === 0) {
            console.log('❌ Eve27 no encontrado');
            return;
        }

        const userId = users[0].id;
        console.log('✅ Eve27 ID:', userId);
        console.log('');

        // Verificar user_card_inventory
        console.log('📋 Tabla: user_card_inventory');
        const [oldInventory] = await pool.query('SELECT * FROM user_card_inventory WHERE user_id = ?', [userId]);
        console.table(oldInventory);
        console.log('');

        // Verificar card_inventory
        console.log('📋 Tabla: card_inventory');
        const [newInventory] = await pool.query('SELECT * FROM card_inventory WHERE user_id = ?', [userId]);
        console.table(newInventory);
        console.log('');

        // Verificar user_tickets
        console.log('📋 Tabla: user_tickets');
        const [tickets] = await pool.query('SELECT * FROM user_tickets WHERE user_id = ?', [userId]);
        console.table(tickets);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkEve27Inventory();
