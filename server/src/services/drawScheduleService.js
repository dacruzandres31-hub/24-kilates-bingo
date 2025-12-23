const pool = require('../db');

/**
 * DrawScheduleService
 * Provides logic to determine when the next draw will occur for each room.
 */
class DrawScheduleService {
    /**
     * Calculates the next draw time for a given room.
     * @param {string} room - Room name ('starter', 'bronce', 'plata', 'oro')
     * @returns {Promise<{nextDraw: Date, isDrawing: boolean, sessionId: number|null}>}
     */
    async getNextDraw(room) {
        try {
            // 1. Check for an active session in the database
            const [activeSession] = await pool.query(`
        SELECT id, start_time, status 
        FROM game_sessions 
        WHERE room = ? AND status IN ('active', 'playing', 'waiting')
        ORDER BY start_time ASC LIMIT 1
      `, [room]);

            if (activeSession.length > 0) {
                return {
                    nextDraw: new Date(activeSession[0].start_time),
                    isDrawing: activeSession[0].status === 'playing' || activeSession[0].status === 'active',
                    sessionId: activeSession[0].id
                };
            }

            // 2. No active session, check for the next pending session
            const [pendingSession] = await pool.query(`
        SELECT id, start_time, status 
        FROM game_sessions 
        WHERE room = ? AND status = 'pending' AND start_time > NOW()
        ORDER BY start_time ASC LIMIT 1
      `, [room]);

            if (pendingSession.length > 0) {
                return {
                    nextDraw: new Date(pendingSession[0].start_time),
                    isDrawing: false,
                    sessionId: pendingSession[0].id
                };
            }

            // 3. No sessions in DB, calculate based on static schedule configuration
            const [schedules] = await pool.query(`
        SELECT day_of_week, hour 
        FROM schedule_settings 
        WHERE room = ? AND is_active = TRUE 
        ORDER BY day_of_week ASC, hour ASC
      `, [room]);

            if (schedules.length === 0) {
                return { nextDraw: null, isDrawing: false, sessionId: null };
            }

            const now = new Date();
            let nextDraw = null;
            let minDiff = Infinity;

            // Check today and the next 7 days
            for (let i = 0; i <= 7; i++) {
                const checkDate = new Date(now);
                checkDate.setDate(checkDate.getDate() + i);
                const dayOfWeek = checkDate.getDay();

                const todaySchedules = schedules.filter(s => s.day_of_week === dayOfWeek);
                for (const schedule of todaySchedules) {
                    const [h, m, s] = schedule.hour.split(':').map(Number);
                    const drawTime = new Date(checkDate);
                    drawTime.setHours(h, m, s || 0, 0);

                    if (drawTime > now) {
                        const diff = drawTime - now;
                        if (diff < minDiff) {
                            minDiff = diff;
                            nextDraw = drawTime;
                        }
                    }
                }

                if (nextDraw) break; // Found the earliest next draw
            }

            return {
                nextDraw,
                isDrawing: false,
                sessionId: null
            };
        } catch (error) {
            console.error(`[DrawScheduleService] Error calculating next draw for ${room}:`, error);
            throw error;
        }
    }
}

module.exports = new DrawScheduleService();
