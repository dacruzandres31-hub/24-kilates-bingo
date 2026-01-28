const pool = require('../../db');
const cardPoolService = require('../../services/cardPoolService');

/**
 * Sincronizar cartones seleccionados en sala Starter
 * @param {number} userId - ID del usuario
 * @param {Array} selectedCards - Cartones seleccionados
 * @returns {Promise<void>}
 */
async function syncStarterCards(userId, selectedCards) {
    try {
        console.log(`[Sync] 🔄 Sincronizando selección Starter para usuario ${userId}`);

        // 1. Buscar sesión activa de starter (playing, starting, pending)
        const [activeSession] = await pool.query(
            `SELECT id FROM game_sessions 
             WHERE room = 'starter' AND status IN ('playing', 'starting', 'pending', 'active') 
             ORDER BY FIELD(status, 'playing', 'starting', 'pending', 'active'), created_at DESC 
             LIMIT 1`
        );

        if (activeSession.length === 0) {
            console.warn('[Sync] ⚠️ No hay sesión activa de Starter');
            return;
        }

        const sessionId = activeSession[0].id;
        
        // 2. Actualizar game_session_id en bingo_cards_pool para estos cartones
        const cardIds = selectedCards.map(c => c.id);
        if (cardIds.length > 0) {
            await pool.query(
                `UPDATE bingo_cards_pool 
                 SET game_session_id = ? 
                 WHERE id IN (?) AND selected_by = ?`,
                [sessionId, cardIds, userId]
            );
            console.log(`[Sync] ✅ ${cardIds.length} cartones asignados a sesión ${sessionId}`);
        }

        console.log(`[Sync] ✅ Sincronización Starter exitosa para sesión ${sessionId}`);
    } catch (error) {
        console.error('[Sync] ❌ Error en sincronización Starter:', error);
        // No bloqueamos la respuesta al usuario ya que bingo_cards_pool ya se guardó
    }
}

/**
 * Sincronizar cartones en card_pool para persistencia
 * @param {number} sessionId - ID de la sesión
 * @param {number} userId - ID del usuario
 * @param {Array} cards - Cartones a sincronizar
 * @returns {Promise<void>}
 */
async function syncCardPool(sessionId, userId, cards) {
    // 1. Limpiar cartones previos del usuario en esta sesión
    await pool.query(
        "DELETE FROM card_pool WHERE session_id = ? AND reserved_by = ?",
        [sessionId, userId]
    );

    // 2. Insertar nuevos cartones
    const values = cards.map(c => [
        c.id,
        sessionId,
        c.serial,
        JSON.stringify(c.numbers),
        'reserved',
        userId
    ]);

    if (values.length > 0) {
        await pool.query(
            "INSERT INTO card_pool (id, session_id, serial, numbers, status, reserved_by, reserved_at) VALUES ?",
            [values]
        );

        // 3. Forzar recarga del pool de memoria
        await cardPoolService.loadPoolFromDB(sessionId);

        console.log(`[Sync] 📦 ${values.length} cartones sincronizados en card_pool para sesión ${sessionId}`);
    }
}

module.exports = {
    syncStarterCards,
    syncCardPool
};
