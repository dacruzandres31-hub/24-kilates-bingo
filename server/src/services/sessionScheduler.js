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

/**
 * AUTO DRAW STARTER
 * Monitorea sesiones pendientes e inicia sorteos automáticamente cuando llega la hora
 */
class AutoDrawStarter {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.checkInterval = null;
        this.isChecking = false;
    }

    /**
     * Inicia el monitor automático
     */
    start() {
        // Revisar cada minuto
        this.checkInterval = setInterval(() => {
            this.checkPendingSessions();
        }, 60000); // 1 minuto

        // Ejecutar inmediatamente al iniciar
        this.checkPendingSessions();

        console.log('[AutoDrawStarter] ✅ Iniciado - revisando cada 60 segundos');
    }

    /**
     * Revisa sesiones pendientes cuya hora de inicio ya llegó
     */
    async checkPendingSessions() {
        // Evitar ejecuciones concurrentes
        if (this.isChecking) {
            return;
        }

        this.isChecking = true;

        try {
            // Buscar sesiones pendientes cuya hora de inicio ya pasó
            const [sessions] = await pool.query(`
        SELECT id, room, start_time 
        FROM game_sessions 
        WHERE status = 'pending' 
        AND start_time <= NOW()
        AND room != 'starter'
        ORDER BY start_time ASC
      `);

            if (sessions.length > 0) {
                console.log(`[AutoDrawStarter] 🔍 Encontradas ${sessions.length} sesión(es) para iniciar`);

                for (const session of sessions) {
                    await this.startScheduledDraw(session);
                }
            }
        } catch (error) {
            console.error('[AutoDrawStarter] ❌ Error revisando sesiones:', error);
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * Inicia un sorteo programado
     */
    async startScheduledDraw(session) {
        try {
            console.log(`[AutoDrawStarter] 🎮 Iniciando sorteo programado para sesión ${session.id} (${session.room})`);
            console.log(`[AutoDrawStarter] 📅 Hora programada: ${session.start_time}`);

            // Verificar que el gameEngine existe
            if (!this.gameEngine) {
                throw new Error('GameEngine no está disponible');
            }

            // Iniciar el sorteo
            await this.gameEngine.startGame(session.id, {
                drawInterval: 5000,      // 5 segundos entre bolas
                pauseOnWinner: 2000      // 2 segundos de pausa al cantar línea
            });

            console.log(`[AutoDrawStarter] ✅ Sorteo iniciado exitosamente para ${session.room}`);
        } catch (error) {
            console.error(`[AutoDrawStarter] ❌ Error iniciando sesión ${session.id}:`, error.message);
        }
    }

    /**
     * Detiene el monitor
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('[AutoDrawStarter] 🛑 Detenido');
        }
    }

    /**
     * Obtiene el estado
     */
    getStatus() {
        return {
            running: !!this.checkInterval,
            checking: this.isChecking
        };
    }
}

module.exports.AutoDrawStarter = AutoDrawStarter;
