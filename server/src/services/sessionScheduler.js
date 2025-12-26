const pool = require('../db');

/**
 * SESSION SCHEDULER SERVICE
 * 
 * Maneja la programación automática de eventos de sesión:
 * - Cierre de selección de cartones (2 minutos antes del sorteo)
 * - Transferencia de pozos Pre-40 entre sesiones
 */

/**
 * Programa el cierre automático de selección de cartones
 * 2 minutos antes del inicio del sorteo
 * 
 * @param {number} sessionId - ID de la sesión
 * @param {Date} drawTime - Hora programada del sorteo
 */
function scheduleCardSelectionClose(sessionId, drawTime) {
    const closeTime = new Date(drawTime);
    closeTime.setMinutes(closeTime.getMinutes() - 2);

    const now = new Date();
    const delay = closeTime - now;

    if (delay > 0) {
        console.log(`[SessionScheduler] Scheduled card selection close for session ${sessionId} at ${closeTime.toLocaleString()}`);

        setTimeout(async () => {
            try {
                await closeCardSelection(sessionId);
            } catch (error) {
                console.error(`[SessionScheduler] Error closing card selection for session ${sessionId}:`, error);
            }
        }, delay);

        return closeTime;
    } else {
        console.warn(`[SessionScheduler] Draw time is in the past or too soon for session ${sessionId}`);
        return null;
    }
}

/**
 * Cierra la selección de cartones para una sesión
 * @param {number} sessionId - ID de la sesión
 */
async function closeCardSelection(sessionId) {
    try {
        // Marcar la sesión como cerrada para selección
        await pool.query(`
      UPDATE game_sessions
      SET card_selection_closed = TRUE, selection_close_time = NOW()
      WHERE id = ?
    `, [sessionId]);

        // Obtener información de la sesión
        const [session] = await pool.query(`
      SELECT room, current_pot_bingo, current_pot_linea, accumulated_pot
      FROM game_sessions
      WHERE id = ?
    `, [sessionId]);

        if (session.length > 0) {
            const pots = session[0];

            console.log(`🔒 [SessionScheduler] Card selection closed for session ${sessionId}`);
            console.log(`   Room: ${pots.room}`);
            console.log(`   Bingo Pot: $${pots.current_pot_bingo}`);
            console.log(`   Línea Pot: $${pots.current_pot_linea}`);
            console.log(`   Pre-40 Pot: $${pots.accumulated_pot}`);

            // Emitir evento Socket.IO
            if (global.io) {
                global.io.to(`session_${sessionId}`).emit('card_selection_closed', {
                    sessionId,
                    pots: {
                        bingo: parseFloat(pots.current_pot_bingo),
                        linea: parseFloat(pots.current_pot_linea),
                        pre40: parseFloat(pots.accumulated_pot)
                    },
                    message: 'Selección de cartones cerrada. El sorteo comenzará en 2 minutos.'
                });

                // También emitir a toda la sala
                global.io.to(`room_${pots.room}`).emit('card_selection_closed', {
                    sessionId,
                    room: pots.room,
                    message: `Sala ${pots.room}: Selección cerrada`
                });
            }
        }

    } catch (error) {
        console.error('[SessionScheduler] Error closing card selection:', error);
        throw error;
    }
}

/**
 * Programa todos los eventos automáticos para una sesión
 * @param {number} sessionId - ID de la sesión
 * @param {Date} drawTime - Hora programada del sorteo
 */
function scheduleSessionEvents(sessionId, drawTime) {
    const events = {
        cardSelectionClose: null
    };

    // Programar cierre de selección (2 min antes)
    events.cardSelectionClose = scheduleCardSelectionClose(sessionId, drawTime);

    return events;
}

module.exports = {
    scheduleCardSelectionClose,
    closeCardSelection,
    scheduleSessionEvents
};
