const pool = require('../../db');

/**
 * Procesar pago con balance del usuario
 * @param {Object} connection - Conexión de BD (para transacción)
 * @param {number} userId - ID del usuario
 * @param {number} totalCost - Costo total
 * @param {string} description - Descripción del movimiento
 * @returns {Promise<number>} Balance después del pago
 */
async function processBalancePayment(connection, userId, totalCost, description) {
    // Obtener balance actual
    const [userData] = await connection.query(
        `SELECT balance FROM users WHERE id = ?`,
        [userId]
    );

    const currentBalance = parseFloat(userData[0]?.balance || 0);
    const newBalance = currentBalance - totalCost;

    console.log(`[Payment] ✅ Cobrando $${totalCost} del balance del usuario ${userId}`);

    // Actualizar balance
    await connection.query(
        `UPDATE users SET balance = balance - ? WHERE id = ?`,
        [totalCost, userId]
    );

    // Registrar movimiento de fichas
    await connection.query(
        `INSERT INTO chips_movements 
     (user_id, movement_type, amount, balance_after, description, created_at)
     VALUES (?, 'purchase', ?, ?, ?, NOW())`,
        [userId, totalCost, newBalance, description]
    );

    return newBalance;
}

/**
 * Procesar pago con tickets del inventario
 * @param {Object} connection - Conexión de BD
 * @param {number} userId - ID del usuario
 * @param {string} room - Sala
 * @param {number} quantity - Cantidad de tickets a usar
 * @param {boolean} isGift - Si son tickets de regalo
 */
async function processTicketPayment(connection, userId, room, quantity, isGift = false) {
    console.log(`[Payment] 🎫 Usando ${quantity} tickets ${isGift ? 'gratis' : 'pagos'} de ${room}`);

    await connection.query(
        `UPDATE user_card_inventory 
     SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND room = ? AND is_gift = ?`,
        [quantity, userId, room, isGift]
    );

    // Registrar movimiento
    await connection.query(
        `INSERT INTO card_movements_log 
     (user_id, room, movement_type, quantity, is_gift, reason, executed_by, created_at)
     VALUES (?, ?, 'debit', ?, ?, 'Cartones usados para juego', ?, CURRENT_TIMESTAMP)`,
        [userId, room, quantity, isGift, userId]
    );
}

/**
 * Crear inventario de cartones para el usuario
 * @param {Object} connection - Conexión de BD
 * @param {number} userId - ID del usuario
 * @param {string} room - Sala
 * @param {number} quantity - Cantidad de cartones
 * @param {boolean} isGift - Si son cartones de regalo
 */
async function createCardInventory(connection, userId, room, quantity, isGift = false) {
    console.log(`[Payment] 📦 Creando inventario: ${quantity} cartones ${isGift ? 'PLUS' : 'normales'} en ${room}`);

    // Verificar si ya existe inventario
    const [existing] = await connection.query(
        `SELECT id, quantity FROM user_card_inventory 
     WHERE user_id = ? AND room = ? AND is_gift = ?`,
        [userId, room, isGift]
    );

    if (existing.length > 0) {
        // Actualizar existente
        await connection.query(
            `UPDATE user_card_inventory 
       SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
            [quantity, existing[0].id]
        );
    } else {
        // Crear nuevo
        await connection.query(
            `INSERT INTO user_card_inventory 
       (user_id, room, quantity, is_gift, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [userId, room, quantity, isGift]
        );
    }

    // Registrar movimiento
    await connection.query(
        `INSERT INTO card_movements_log 
     (user_id, room, movement_type, quantity, is_gift, reason, executed_by, created_at)
     VALUES (?, ?, 'credit', ?, ?, 'Cartones comprados con balance', ?, CURRENT_TIMESTAMP)`,
        [userId, room, quantity, isGift, userId]
    );
}

module.exports = {
    processBalancePayment,
    processTicketPayment,
    createCardInventory
};
