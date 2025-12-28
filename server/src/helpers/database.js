/**
 * Operaciones de base de datos optimizadas
 * Funciones reutilizables para consultas comunes
 */

const pool = require('../db');

/**
 * Obtener tickets disponibles del usuario (con caché)
 */
async function getUserTickets(userId, room) {
    const [inventory] = await pool.query(
        `SELECT 
       COALESCE(SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END), 0) as paid_quantity,
       COALESCE(SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END), 0) as free_quantity
     FROM user_card_inventory 
     WHERE user_id = ? AND room = ?`,
        [userId, room]
    );

    return {
        paid: inventory[0]?.paid_quantity || 0,
        free: inventory[0]?.free_quantity || 0,
        total: (inventory[0]?.paid_quantity || 0) + (inventory[0]?.free_quantity || 0)
    };
}

/**
 * Obtener configuración de sala (con caché)
 */
async function getRoomSettings(room) {
    const [settings] = await pool.query(
        `SELECT card_price, agent_bonus_percentage 
     FROM room_settings 
     WHERE room = ? LIMIT 1`,
        [room]
    );

    if (!settings || settings.length === 0) {
        throw new Error(`No se encontró configuración para sala ${room}`);
    }

    return {
        cardPrice: parseFloat(settings[0].card_price || 0),
        agentBonus: parseFloat(settings[0].agent_bonus_percentage || 10)
    };
}

/**
 * Obtener balance del usuario
 */
async function getUserBalance(userId) {
    const [userData] = await pool.query(
        `SELECT balance FROM users WHERE id = ? LIMIT 1`,
        [userId]
    );

    if (!userData || userData.length === 0) {
        throw new Error('Usuario no encontrado');
    }

    return parseFloat(userData[0].balance || 0);
}

/**
 * Actualizar balance del usuario (dentro de transacción)
 */
async function updateUserBalance(connection, userId, amount, description) {
    // Obtener balance actual
    const [userData] = await connection.query(
        `SELECT balance FROM users WHERE id = ?`,
        [userId]
    );

    const currentBalance = parseFloat(userData[0]?.balance || 0);
    const newBalance = currentBalance + amount; // amount puede ser negativo

    // Actualizar balance
    await connection.query(
        `UPDATE users SET balance = ? WHERE id = ?`,
        [newBalance, userId]
    );

    // Registrar movimiento
    await connection.query(
        `INSERT INTO chips_movements 
     (user_id, movement_type, amount, balance_after, description, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
        [userId, amount < 0 ? 'purchase' : 'credit', Math.abs(amount), newBalance, description]
    );

    return newBalance;
}

/**
 * Actualizar inventario de cartones (dentro de transacción)
 */
async function updateCardInventory(connection, userId, room, quantity, isGift, operation = 'debit') {
    if (operation === 'debit') {
        // Restar cartones
        await connection.query(
            `UPDATE user_card_inventory 
       SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND room = ? AND is_gift = ?`,
            [quantity, userId, room, isGift]
        );
    } else {
        // Agregar cartones (credit)
        const [existing] = await connection.query(
            `SELECT id FROM user_card_inventory 
       WHERE user_id = ? AND room = ? AND is_gift = ?`,
            [userId, room, isGift]
        );

        if (existing.length > 0) {
            await connection.query(
                `UPDATE user_card_inventory 
         SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND room = ? AND is_gift = ?`,
                [quantity, userId, room, isGift]
            );
        } else {
            await connection.query(
                `INSERT INTO user_card_inventory 
         (user_id, room, quantity, is_gift, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [userId, room, quantity, isGift]
            );
        }
    }

    // Registrar movimiento
    await connection.query(
        `INSERT INTO card_movements_log 
     (user_id, room, movement_type, quantity, is_gift, reason, executed_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, room, operation, quantity, isGift, `Cartones ${operation === 'debit' ? 'usados' : 'agregados'}`, userId]
    );
}

/**
 * Obtener sesión activa de una sala
 */
async function getActiveSession(room) {
    const [session] = await pool.query(
        `SELECT id, status, total_cards_validated, card_price
     FROM game_sessions 
     WHERE room = ? AND status IN ('pending', 'active') 
     ORDER BY created_at DESC 
     LIMIT 1`,
        [room]
    );

    return session.length > 0 ? session[0] : null;
}

/**
 * Actualizar contador de cartones en sesión
 */
async function updateSessionCardCount(sessionId, cardCount) {
    await pool.query(
        `UPDATE game_sessions 
     SET total_cards_validated = total_cards_validated + ? 
     WHERE id = ?`,
        [cardCount, sessionId]
    );
}

module.exports = {
    getUserTickets,
    getRoomSettings,
    getUserBalance,
    updateUserBalance,
    updateCardInventory,
    getActiveSession,
    updateSessionCardCount
};
