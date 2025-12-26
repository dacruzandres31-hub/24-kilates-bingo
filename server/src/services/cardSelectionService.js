const pool = require('../db');

/**
 * CARD SELECTION SERVICE
 * 
 * Maneja la selección de cartones para salas pagas (Bronce/Plata/Oro).
 * Prioriza cartones pagos sobre regalos (90% pagos, 10% regalo).
 * Solo cartones pagos contribuyen a los pozos.
 */

/**
 * Obtiene el precio de un cartón según la sala
 * @param {string} room - Sala (bronce/plata/oro)
 * @returns {Promise<number>} - Precio del cartón
 */
async function getCardPrice(room) {
    // Precios por sala (pueden venir de configuración)
    const prices = {
        'bronce': 100,
        'plata': 200,
        'oro': 300
    };

    // TODO: Obtener de room_config o room_settings si existe
    return prices[room] || 100;
}

/**
 * Selecciona cartones para un jugador priorizando cartones pagos
 * 
 * Reglas:
 * - 90% de cartones pagos
 * - 10% de cartones regalo
 * - Cartones Plus cuentan como regalo
 * - Solo cartones pagos contribuyen al pozo
 * 
 * @param {number} userId - ID del jugador
 * @param {string} room - Sala (bronce/plata/oro)
 * @param {number} quantity - Cantidad de cartones a seleccionar
 * @returns {Promise<object>} - { paidCards, giftCards, totalCards, potContribution, cardPrice }
 */
async function selectCardsForSession(userId, room, quantity) {
    try {
        // 1. Obtener inventario del jugador
        const [inventory] = await pool.query(`
      SELECT 
        SUM(CASE WHEN is_gift = 0 THEN quantity ELSE 0 END) as paid,
        SUM(CASE WHEN is_gift = 1 THEN quantity ELSE 0 END) as gift
      FROM user_card_inventory
      WHERE user_id = ? AND room = ?
    `, [userId, room]);

        const availablePaid = parseInt(inventory[0]?.paid) || 0;
        const availableGift = parseInt(inventory[0]?.gift) || 0;
        const totalAvailable = availablePaid + availableGift;

        console.log(`[CardSelection] User ${userId} - Room ${room}: ${availablePaid} paid, ${availableGift} gift`);

        // 2. Verificar disponibilidad total
        if (totalAvailable < quantity) {
            throw new Error(`Insufficient cards. Available: ${totalAvailable}, Requested: ${quantity}`);
        }

        // 3. Calcular distribución objetivo (90% pagos, 10% regalo)
        const targetPaid = Math.floor(quantity * 0.9);
        const targetGift = Math.ceil(quantity * 0.1);

        // 4. Ajustar según disponibilidad real
        let paidToUse = Math.min(targetPaid, availablePaid);
        let giftToUse = Math.min(targetGift, availableGift);

        // Si no hay suficientes pagos, compensar con regalos
        if (paidToUse < targetPaid) {
            const shortage = targetPaid - paidToUse;
            giftToUse = Math.min(giftToUse + shortage, availableGift);
        }

        // Si no hay suficientes regalos, compensar con pagos
        if (giftToUse < targetGift) {
            const shortage = targetGift - giftToUse;
            paidToUse = Math.min(paidToUse + shortage, availablePaid);
        }

        // 5. Calcular contribución al pozo (solo cartones pagos)
        const cardPrice = await getCardPrice(room);
        const potContribution = paidToUse * cardPrice;

        const result = {
            paidCards: paidToUse,
            giftCards: giftToUse,
            totalCards: paidToUse + giftToUse,
            potContribution,
            cardPrice,
            room
        };

        console.log(`[CardSelection] Selection result:`, result);

        return result;

    } catch (error) {
        console.error('[CardSelection] Error:', error);
        throw error;
    }
}

/**
 * Descuenta cartones del inventario del jugador
 * @param {number} userId - ID del jugador
 * @param {string} room - Sala
 * @param {object} selection - Resultado de selectCardsForSession
 */
async function deductCardsFromInventory(userId, room, selection) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Descontar cartones pagos
        if (selection.paidCards > 0) {
            await connection.query(`
        UPDATE user_card_inventory
        SET quantity = quantity - ?
        WHERE user_id = ? AND room = ? AND is_gift = 0 AND quantity >= ?
      `, [selection.paidCards, userId, room, selection.paidCards]);
        }

        // Descontar cartones regalo
        if (selection.giftCards > 0) {
            await connection.query(`
        UPDATE user_card_inventory
        SET quantity = quantity - ?
        WHERE user_id = ? AND room = ? AND is_gift = 1 AND quantity >= ?
      `, [selection.giftCards, userId, room, selection.giftCards]);
        }

        // Eliminar registros con cantidad 0
        await connection.query(`
      DELETE FROM user_card_inventory
      WHERE user_id = ? AND room = ? AND quantity <= 0
    `, [userId, room]);

        await connection.commit();

        console.log(`[CardSelection] Deducted from user ${userId}: ${selection.paidCards} paid, ${selection.giftCards} gift`);

    } catch (error) {
        await connection.rollback();
        console.error('[CardSelection] Error deducting cards:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Asigna cartones a una sesión de juego
 * @param {number} sessionId - ID de la sesión
 * @param {number} userId - ID del jugador
 * @param {object} selection - Resultado de selectCardsForSession
 */
async function assignCardsToSession(sessionId, userId, selection) {
    try {
        // Registrar la asignación en una tabla de tracking (si existe)
        // O simplemente actualizar daily_stock_cards con los cartones del jugador

        // TODO: Implementar lógica de asignación de cartones específicos
        // Por ahora, solo registramos la cantidad

        await pool.query(`
      INSERT INTO session_card_assignments (session_id, user_id, paid_cards, gift_cards, created_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        paid_cards = paid_cards + VALUES(paid_cards),
        gift_cards = gift_cards + VALUES(gift_cards)
    `, [sessionId, userId, selection.paidCards, selection.giftCards]);

        console.log(`[CardSelection] Assigned cards to session ${sessionId} for user ${userId}`);

    } catch (error) {
        // Si la tabla no existe, solo logear
        console.log(`[CardSelection] Note: session_card_assignments table may not exist yet`);
    }
}

module.exports = {
    getCardPrice,
    selectCardsForSession,
    deductCardsFromInventory,
    assignCardsToSession
};
