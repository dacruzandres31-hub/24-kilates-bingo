const pool = require('../db');

/**
 * POT ACCUMULATION SERVICE
 * 
 * Maneja la acumulación de pozos para salas pagas (Bronce/Plata/Oro).
 * Distribución: 50% Bingo, 15% Línea, 5% Pre-40
 * 
 * Solo cartones pagos contribuyen a los pozos.
 */

/**
 * Actualiza los pozos de una sesión cuando un jugador selecciona cartones
 * 
 * Distribución de contribución:
 * - 50% → Pozo Bingo (current_pot_bingo)
 * - 15% → Pozo Línea (current_pot_linea)
 * - 5% → Pozo Pre-40 (accumulated_pot) - acumulativo entre sesiones
 * - 30% → Comisión de la casa
 * 
 * @param {number} sessionId - ID de la sesión
 * @param {number} potContribution - Contribución total de cartones pagos (precio * cantidad)
 * @returns {Promise<object>} - Pozos actualizados { current_pot_bingo, current_pot_linea, accumulated_pot }
 */
async function updateSessionPots(sessionId, potContribution) {
    try {
        // Distribución de la contribución
        const bingoIncrease = potContribution * 0.50;  // 50%
        const lineaIncrease = potContribution * 0.15;  // 15%
        const pre40Increase = potContribution * 0.05;  // 5%
        // 30% restante = comisión de la casa

        console.log(`[PotAccumulation] Session ${sessionId} - Contribution: $${potContribution}`);
        console.log(`  Bingo: +$${bingoIncrease.toFixed(2)} (50%)`);
        console.log(`  Línea: +$${lineaIncrease.toFixed(2)} (15%)`);
        console.log(`  Pre-40: +$${pre40Increase.toFixed(2)} (5%)`);

        // Actualizar pozos en la sesión
        await pool.query(`
      UPDATE game_sessions
      SET 
        jackpot_bingo = jackpot_bingo + ?,
        jackpot_linea = jackpot_linea + ?,
        jackpot_pre40 = jackpot_pre40 + ?
      WHERE id = ?
    `, [bingoIncrease, lineaIncrease, pre40Increase, sessionId]);

        // Obtener pozos actualizados
        const [session] = await pool.query(`
      SELECT 
        jackpot_bingo,
        jackpot_linea,
        jackpot_pre40,
        room
      FROM game_sessions
      WHERE id = ?
    `, [sessionId]);

        if (session.length === 0) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const room = session[0].room;

        // ACTUALIZACIÓN GLOBAL: Incrementar pozo acumulado de la sala (Pre-40) en room_settings
        if (['bronce', 'plata', 'oro'].includes(room)) {
            await pool.query(
                `UPDATE room_settings 
                 SET accumulated_pot_pre40 = accumulated_pot_pre40 + ?
                 WHERE room = ?`,
                [pre40Increase, room]
            );
        }

        const updatedPots = {
            jackpot_bingo: parseFloat(session[0].jackpot_bingo),
            jackpot_linea: parseFloat(session[0].jackpot_linea),
            jackpot_pre40: parseFloat(session[0].jackpot_pre40),
            room: room
        };

        // Emitir actualización en tiempo real
        const websocketService = require('./websocketService');
        websocketService.emitPotsUpdate();

        // VERIFICACIÓN DE POZOS CALIENTES
        const thresholds = {
            'bronce': 100000,
            'plata': 500000,
            'oro': 1000000
        };

        const threshold = thresholds[room];
        if (threshold) {
            // Verificar Pozo Bingo
            if (updatedPots.jackpot_bingo >= threshold) {
                websocketService.emitHotPotAlert(room, 'bingo', updatedPots.jackpot_bingo);
            }
            // Verificar Pozo Pre-40
            if (updatedPots.jackpot_pre40 >= threshold) {
                websocketService.emitHotPotAlert(room, 'pre40', updatedPots.jackpot_pre40);
            }
        }

        console.log(`[PotAccumulation] Updated pots and broadcasted:`, updatedPots);

        return updatedPots;

    } catch (error) {
        console.error('[PotAccumulation] Error updating pots:', error);
        throw error;
    }
}

/**
 * Resetea los pozos de una sesión después de que se otorgaron los premios
 * @param {number} sessionId - ID de la sesión
 * @param {boolean} resetPre40 - Si se debe resetear el pozo Pre-40 (solo si se ganó antes de bolilla 40)
 */
async function resetSessionPots(sessionId, resetPre40 = false) {
    try {
        if (resetPre40) {
            // Resetear todos los pozos (ganó Pre-40 Jackpot)
            await pool.query(`
        UPDATE game_sessions
        SET 
          jackpot_bingo = 0,
          jackpot_linea = 0,
          jackpot_pre40 = 0
        WHERE id = ?
      `, [sessionId]);

            console.log(`[PotAccumulation] Session ${sessionId} - All pots reset (Pre-40 won)`);
        } else {
            // Solo resetear pozos de línea y bingo, mantener Pre-40
            await pool.query(`
        UPDATE game_sessions
        SET 
          jackpot_bingo = 0,
          jackpot_linea = 0
        WHERE id = ?
      `, [sessionId]);

            console.log(`[PotAccumulation] Session ${sessionId} - Bingo/Línea pots reset (Pre-40 carries over)`);
        }

    } catch (error) {
        console.error('[PotAccumulation] Error resetting pots:', error);
        throw error;
    }
}

/**
 * Obtiene el pozo Pre-40 acumulado actual (para mostrar en lobby)
 * @param {string} room - Sala (bronce/plata/oro)
 * @returns {Promise<number>} - Monto del pozo Pre-40
 */
async function getPre40Pot(room) {
    try {
        // Obtener el pozo Pre-40 de la sesión más reciente de la sala
        const [result] = await pool.query(`
      SELECT jackpot_pre40
      FROM game_sessions
      WHERE room = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [room]);

        return result.length > 0 ? parseFloat(result[0].jackpot_pre40) : 0;

    } catch (error) {
        console.error('[PotAccumulation] Error getting Pre-40 pot:', error);
        return 0;
    }
}

/**
 * Transfiere el pozo Pre-40 de una sesión anterior a una nueva sesión
 * (Para mantener la acumulación entre sorteos)
 * @param {string} room - Sala
 * @param {number} newSessionId - ID de la nueva sesión
 */
async function transferPre40Pot(room, newSessionId) {
    try {
        // Obtener pozo Pre-40 de la sesión anterior
        const [prevSession] = await pool.query(`
      SELECT jackpot_pre40
      FROM game_sessions
      WHERE room = ? AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `, [room]);

        if (prevSession.length > 0 && prevSession[0].jackpot_pre40 > 0) {
            const pre40Amount = parseFloat(prevSession[0].jackpot_pre40);

            // Transferir a la nueva sesión
            await pool.query(`
        UPDATE game_sessions
        SET jackpot_pre40 = ?
        WHERE id = ?
      `, [pre40Amount, newSessionId]);

            console.log(`[PotAccumulation] Transferred Pre-40 pot: $${pre40Amount} from previous session to ${newSessionId}`);

            return pre40Amount;
        }

        return 0;

    } catch (error) {
        console.error('[PotAccumulation] Error transferring Pre-40 pot:', error);
        return 0;
    }
}

module.exports = {
    updateSessionPots,
    resetSessionPots,
    getPre40Pot,
    transferPre40Pot
};
