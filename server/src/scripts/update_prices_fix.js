const pool = require('../db');

async function updatePrices() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Connected to DB. Updating prices...');

        // Updates based on plan names (assuming standard names)
        // Bronze -> 10000
        await connection.execute("UPDATE memberships SET price = 10000 WHERE name LIKE '%Bronce%'");
        // Silver -> 20000
        await connection.execute("UPDATE memberships SET price = 20000 WHERE name LIKE '%Plata%'");
        // Gold -> 50000
        await connection.execute("UPDATE memberships SET price = 50000 WHERE name LIKE '%Oro%'");

        console.log('Prices updated successfully to 10k/20k/50k.');

    } catch (error) {
        console.error('Error updating prices:', error);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

updatePrices();
