const pool = require('../../db');
const potAccumulationService = require('../../services/potAccumulationService');
const websocketService = require('../../services/websocketService');

/**
 * Calcular contribución al pozo basado en precio y cantidad
 * @param {string} room - Sala (bronce, plata, oro)
 * @param {number} purchasedCount - Cantidad de cartones comprados (no gift)
 * @returns {Promise<{cardPrice: number, potContribution: number}>}
 */
async function calculatePotContribution(room, purchasedCount) {
    const [roomSettings] = await pool.query(
        "SELECT card_price FROM room_settings WHERE room = ?",
        [room]
    );

    const cardPrice = parseFloat(roomSettings[0]?.card_price || 0);
    const potContribution = cardPrice * purchasedCount;

    console.log(`[PotUpdate] 💰 Contribución al pozo: ${purchasedCount} cartones × $${cardPrice} = $${potContribution}`);

    return { cardPrice, potContribution };
}

/**
 * Actualizar contador de cartones en la sesión
 * @param {number} sessionId - ID de la sesión
 * @param {number} cardCount - Cantidad de cartones a agregar
 */
async function updateCardCount(sessionId, cardCount) {
    await pool.query(
        "UPDATE game_sessions SET total_cards_validated = total_cards_validated + ? WHERE id = ?",
        [cardCount, sessionId]
    );

    console.log(`[PotUpdate] 📊 Contador de cartones actualizado: +${cardCount} en sesión ${sessionId}`);
}

/**
 * Actualizar pozos de la sesión y emitir eventos WebSocket
 * @param {string} room - Sala
 * @param {number} purchasedCount - Cantidad de cartones comprados
 * @param {number} totalCards - Total de cartones (incluye gift)
 * @returns {Promise<void>}
 */
async function updateSessionPots(room, purchasedCount, totalCards) {
    try {
        // 1. Buscar sesión activa
        const [activeSession] = await pool.query(
            "SELECT id FROM game_sessions WHERE room = ? AND status IN ('pending', 'active') ORDER BY created_at DESC LIMIT 1",
            [room]
        );

        if (activeSession.length === 0) {
            console.warn(`[PotUpdate] ⚠️ No se encontró sesión activa para sala ${room}`);
            websocketService.emitPotsUpdate();
            return;
        }

        const sessionId = activeSession[0].id;

        // 2. Calcular contribución
        const { potContribution } = await calculatePotContribution(room, purchasedCount);

        // 3. Actualizar contador de cartones
        await updateCardCount(sessionId, totalCards);

        // 4. Actualizar pozos (esto ya emite WebSocket internamente)
        if (potContribution > 0) {
            await potAccumulationService.updateSessionPots(sessionId, potContribution);
            console.log(`[PotUpdate] ✅ Pozos actualizados y emitidos para sesión ${sessionId}`);
        } else {
            // Si no hay contribución (todos gift cards), solo emitir actualización
            websocketService.emitPotsUpdate();
            console.log(`[PotUpdate] 📡 Pozos emitidos sin cambios (sin contribución monetaria)`);
        }
    } catch (error) {
        console.error('[PotUpdate] ❌ Error actualizando pozos:', error);
        // Intentar emitir de todas formas
        websocketService.emitPotsUpdate();
        throw error;
    }
}

module.exports = {
    calculatePotContribution,
    updateCardCount,
    updateSessionPots
};
