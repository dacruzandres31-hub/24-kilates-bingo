const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: 'bingo2024',
    database: 'bingo_24k'
};

async function testSelectCards() {
    const pool = mysql.createPool(config);
    const connection = await pool.getConnection();

    try {
        const userId = 1; // Assuming user index 1 exists
        const room = 'bronze';
        const cardIds = [1, 2, 3]; // Adjust to available IDs

        console.log('--- Testing Select Cards ---');

        // 1. Check if cards are available
        const [available] = await connection.query(
            "SELECT id FROM bingo_cards_pool WHERE room = 'bronce' AND status = 'available' LIMIT 3"
        );

        if (available.length < 3) {
            console.log('Not enough available cards in pool to test.');
            return;
        }

        const testIds = available.map(c => c.id);
        console.log('Selected test IDs:', testIds);

        // 2. Start transaction (Simulating selectCards logic)
        await connection.beginTransaction();

        // Update status
        await connection.query(
            "UPDATE bingo_cards_pool SET status = 'selected', selected_by = ?, selected_at = NOW() WHERE id IN (?)",
            [userId, testIds]
        );

        // Fetch them back
        const [selected] = await connection.query(
            "SELECT id, card_serial, numbers, is_gift, selected_at FROM bingo_cards_pool WHERE id IN (?)",
            [testIds]
        );

        console.log('Selected cards from pool:', selected.length);

        // Insert into validated_cards
        const sessionId = 1; // Dummy session ID
        const cardPrice = 1000;
        const insertValues = selected.map(c => [
            userId,
            sessionId,
            'bronce',
            c.card_serial,
            typeof c.numbers === 'object' ? JSON.stringify(c.numbers) : c.numbers,
            c.is_gift || 0,
            (cardPrice * 0.7)
        ]);

        await connection.query(
            "INSERT INTO validated_cards (player_id, game_session_id, room, serial_number, grid_numbers, is_gift, contributed_amount) VALUES ?",
            [insertValues]
        );

        await connection.commit();
        console.log('Transaction committed successfully.');

        // 3. Verify getMySelectedCards logic
        const [validated] = await connection.query(
            "SELECT id, serial_number as card_serial, grid_numbers as numbers, validated_at as selected_at, game_session_id, is_gift FROM validated_cards WHERE player_id = ? AND game_session_id = ?",
            [userId, sessionId]
        );

        console.log('Retrieved from validated_cards:', validated.length);
        if (validated.length > 0) {
            console.log('First card selectedAt:', validated[0].selected_at);
        }

    } catch (error) {
        console.error('Test failed:', error);
        if (connection) await connection.rollback();
    } finally {
        connection.release();
        await pool.end();
    }
}

testSelectCards();
