const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function runTest() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const userId = 1040; // Eve27

    try {
        console.log('--- RAW INVENTORY ---');
        const [rows] = await connection.query('SELECT * FROM user_card_inventory WHERE user_id = ?', [userId]);
        console.table(rows);

        console.log('\n--- TARGET QUERY ---');
        const [updatedInventory] = await connection.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_bronce,
        COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_plata,
        COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = FALSE THEN quantity ELSE 0 END), 0) as cards_oro,
        COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_bronce,
        COALESCE(SUM(CASE WHEN room = 'plata' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_plata,
        COALESCE(SUM(CASE WHEN room = 'oro' AND is_gift = TRUE THEN quantity ELSE 0 END), 0) as gift_oro
      FROM user_card_inventory
      WHERE user_id = ?
    `, [userId]);

        const inv = updatedInventory[0];
        console.log('Query Result:', inv);

        const cartonesTotal = {
            bronce: (parseInt(inv.cards_bronce) || 0) + (parseInt(inv.gift_bronce) || 0),
            plata: (parseInt(inv.cards_plata) || 0) + (parseInt(inv.gift_plata) || 0),
            oro: (parseInt(inv.cards_oro) || 0) + (parseInt(inv.gift_oro) || 0)
        };
        console.log('Calculated Totals:', cartonesTotal);

        // Test with explicit 0/1 instead of FALSE/TRUE
        console.log('\n--- ALTERNATIVE QUERY (0/1) ---');
        const [matches] = await connection.query(`
       SELECT 
        COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = 0 THEN quantity ELSE 0 END), 0) as cards_bronce_alt,
        COALESCE(SUM(CASE WHEN room = 'bronce' AND is_gift = 1 THEN quantity ELSE 0 END), 0) as gift_bronce_alt
      FROM user_card_inventory
      WHERE user_id = ?
    `, [userId]);
        console.log('Alternative Result:', matches[0]);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

runTest();
