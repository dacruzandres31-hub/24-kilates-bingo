const pool = require('../db');

/**
 * SESSION SERVICE
 * 
 * Centraliza la lógica de búsqueda y creación de sesiones.
 */

/**
 * Calcula próximas sesiones basadas en horarios configurados
 */
async function calculateUpcomingSessions(room, limit = 1) {
    const now = new Date();
    const currentDay = now.getDay();

    // Obtener horarios configurados para esta sala
    const [schedules] = await pool.query(`
    SELECT day_of_week, hour
    FROM schedule_settings
    WHERE room = ? AND is_active = 1
    ORDER BY day_of_week ASC, hour ASC
  `, [room]);

    if (schedules.length === 0) {
        return [];
    }

    const upcomingSessions = [];
    let daysChecked = 0;

    while (upcomingSessions.length < limit && daysChecked < 14) {
        const checkDate = new Date(now);
        checkDate.setDate(checkDate.getDate() + daysChecked);
        const checkDay = checkDate.getDay();

        const daySchedules = schedules.filter(s => s.day_of_week === checkDay);

        for (const schedule of daySchedules) {
            const [hour, minute] = schedule.hour.split(':').map(Number);
            const sessionTime = new Date(checkDate);
            sessionTime.setHours(hour, minute, 0, 0);

            if (sessionTime > now) {
                upcomingSessions.push({
                    room,
                    start_time: sessionTime,
                    status: 'pending'
                });

                if (upcomingSessions.length >= limit) break;
            }
        }
        daysChecked++;
    }

    return upcomingSessions;
}

/**
 * Obtiene la sesión activa/pendiente actual o crea una nueva basada en el horario
 */
async function getOrCreateActiveSession(room) {
    try {
        // 1. Buscar sesión real activa/pendiente
        const [existing] = await pool.query(`
      SELECT id, room, status, start_time 
      FROM game_sessions 
      WHERE room = ? AND status IN ('active', 'pending', 'playing')
      ORDER BY start_time ASC
      LIMIT 1
    `, [room]);

        if (existing.length > 0) {
            return existing[0];
        }

        // 2. Si no existe, crear una basada en el próximo horario programado
        const upcoming = await calculateUpcomingSessions(room, 1);

        if (upcoming.length === 0) {
            console.warn(`[SessionService] No hay horarios programados para la sala: ${room}`);
            return null;
        }

        const sessionData = upcoming[0];

        // Obtener precio de cartones de room_settings
        const [roomSettings] = await pool.query('SELECT card_price FROM room_settings WHERE room = ?', [room]);
        const cardPrice = roomSettings[0]?.card_price || 0;

        // Crear la sesión en la base de datos
        const [result] = await pool.query(`
      INSERT INTO game_sessions 
      (room, start_time, status, cost, jackpot_linea, jackpot_bingo, jackpot_pre40, created_at)
      VALUES (?, ?, 'pending', ?, 0, 0, 0, NOW())
    `, [room, sessionData.start_time, cardPrice]);

        console.log(`[SessionService] ✅ Nueva sesión creada automáticamente para ${room} (ID: ${result.insertId})`);

        return {
            id: result.insertId,
            room,
            status: 'pending',
            start_time: sessionData.start_time
        };
    } catch (error) {
        console.error(`[SessionService] ❌ Error en getOrCreateActiveSession para ${room}:`, error);
        throw error;
    }
}

module.exports = {
    calculateUpcomingSessions,
    getOrCreateActiveSession
};
