const pool = require('../../db');

/**
 * Validar límites de cartones seleccionados
 * @param {Array} cardIds - IDs de cartones seleccionados
 * @throws {Error} Si la cantidad es inválida
 */
function validateCardLimits(cardIds) {
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
        throw new Error('Debes seleccionar al menos un cartón');
    }

    if (cardIds.length > 30) {
        throw new Error('No puedes seleccionar más de 30 cartones');
    }
}

/**
 * Validar tickets disponibles del usuario
 * @param {number} userId - ID del usuario
 * @param {string} room - Sala (bronce, plata, oro)
 * @param {number} purchasedCount - Cantidad de cartones a comprar
 * @returns {Promise<{availablePaid: number, availableFree: number, totalAvailable: number}>}
 */
async function validateUserTickets(userId, room, purchasedCount) {
    const [inventory] = await pool.query(
        `SELECT 
       COALESCE(SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END), 0) as paid_quantity,
       COALESCE(SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END), 0) as free_quantity
     FROM user_card_inventory 
     WHERE user_id = ? AND room = ?`,
        [userId, room]
    );

    const availablePaid = inventory[0]?.paid_quantity || 0;
    const availableFree = inventory[0]?.free_quantity || 0;
    const totalAvailable = availablePaid + availableFree;

    console.log(`[Validation] 📊 Tickets disponibles - Pagos: ${availablePaid}, Gratis: ${availableFree}, Total: ${totalAvailable}, Necesarios: ${purchasedCount}`);

    return { availablePaid, availableFree, totalAvailable };
}

/**
 * Validar balance del usuario para compra
 * @param {number} userId - ID del usuario
 * @param {string} room - Sala
 * @param {number} purchasedCount - Cantidad de cartones
 * @returns {Promise<{cardCost: number, totalCost: number, userBalance: number}>}
 * @throws {Error} Si no hay balance suficiente
 */
async function validateUserBalance(userId, room, purchasedCount) {
    // Obtener precio del cartón
    const [roomSettings] = await pool.query(
        `SELECT card_price FROM room_settings WHERE room = ? LIMIT 1`,
        [room]
    );

    if (!roomSettings || roomSettings.length === 0) {
        throw new Error('No se encontró configuración de precio para esta sala');
    }

    const cardCost = parseFloat(roomSettings[0].card_price);
    const totalCost = cardCost * purchasedCount;

    // Verificar balance del usuario
    const [userData] = await pool.query(
        `SELECT balance FROM users WHERE id = ?`,
        [userId]
    );

    if (!userData || userData.length === 0) {
        throw new Error('Usuario no encontrado');
    }

    const userBalance = parseFloat(userData[0].balance) || 0;

    console.log(`[Validation] 💰 Costo: ${purchasedCount} × $${cardCost} = $${totalCost}, Balance: $${userBalance}`);

    if (userBalance < totalCost) {
        const error = new Error('insufficient_funds');
        error.code = 'insufficient_funds';
        error.details = {
            message: 'No tienes suficientes tickets ni balance. Por favor contacta a tu agente para recargar.',
            required: totalCost,
            balance: userBalance,
            cardCost: cardCost,
            cardsRequested: purchasedCount
        };
        throw error;
    }

    return { cardCost, totalCost, userBalance };
}

module.exports = {
    validateCardLimits,
    validateUserTickets,
    validateUserBalance
};
