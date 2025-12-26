const pool = require('../db');

/**
 * Helper: Calcular próximas sesiones basadas en horarios configurados
 */
async function calculateUpcomingSessions(room, limit = 10) {
  const now = new Date();
  const currentDay = now.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

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

  // Buscar próximas 10 sesiones desde ahora
  while (upcomingSessions.length < limit && daysChecked < 14) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + daysChecked);
    const checkDay = checkDate.getDay();

    // Filtrar horarios de este día
    const daySchedules = schedules.filter(s => s.day_of_week === checkDay);

    for (const schedule of daySchedules) {
      const [hour, minute] = schedule.hour.split(':').map(Number);
      const sessionTime = new Date(checkDate);
      sessionTime.setHours(hour, minute, 0, 0);

      // Solo agregar si es futuro
      if (sessionTime > now) {
        upcomingSessions.push({
          id: null, // No tiene ID en BD aún
          room,
          start_time: sessionTime,
          created_at: null,
          status: 'scheduled', // Estado especial para sesiones calculadas
          source: 'calculated' // Marca para distinguir
        });

        if (upcomingSessions.length >= limit) break;
      }
    }

    daysChecked++;
  }

  return upcomingSessions.slice(0, limit);
}

/**
 * Helper: Obtener configuración de premios por sala
 */
function getRoomPrizeConfig(room) {
  const configs = {
    starter: {
      prize_linea: '1 Ticket para Bronce',
      prize_bingo: '1 Ticket para Oro',
      has_jackpot: false,
      is_ticket_prize: true
    },
    bronce: {
      has_jackpot: true,
      is_ticket_prize: false
    },
    plata: {
      has_jackpot: true,
      is_ticket_prize: false
    },
    oro: {
      has_jackpot: true,
      is_ticket_prize: false
    }
  };

  return configs[room] || null;
}

/**
 * Helper: Obtener o crear sesión activa para Starter
 * Starter siempre tiene una sesión activa (cada hora)
 */
async function getOrCreateStarterSession() {
  const now = new Date();

  // Buscar sesión activa existente
  const [existingSession] = await pool.query(`
    SELECT 
      id, room, start_time, status,
      total_cards_validated, total_paid_cards, total_gift_cards
    FROM game_sessions
    WHERE room = 'starter' 
    AND status IN ('active', 'pending')
    AND start_time > DATE_SUB(NOW(), INTERVAL 1 HOUR)
    ORDER BY start_time DESC
    LIMIT 1
  `);

  if (existingSession.length > 0) {
    return existingSession[0];
  }

  // Crear nueva sesión para la próxima hora
  const nextHour = new Date(now);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(now.getHours() + 1);

  const [result] = await pool.query(`
    INSERT INTO game_sessions 
    (room, start_time, status, jackpot_linea, jackpot_bingo, jackpot_pre40)
    VALUES ('starter', ?, 'active', 0, 0, 0)
  `, [nextHour]);

  return {
    id: result.insertId,
    room: 'starter',
    start_time: nextHour,
    status: 'active',
    total_cards_validated: 0,
    total_paid_cards: 0,
    total_gift_cards: 0
  };
}

/**
 * GET /api/admin/sessions/active
 * Obtener sesiones organizadas por sala (4 salas)
 * - Starter: Siempre activa (cada hora), premios de tickets
 * - Otras: 1 sorteo diario, siempre habilitadas cuando no sortean
 */
exports.getActiveSessions = async (req, res) => {
  try {
    const rooms = ['starter', 'bronce', 'plata', 'oro'];
    const roomsData = [];

    for (const room of rooms) {
      let currentSession = null;
      const prizeConfig = getRoomPrizeConfig(room);

      // Starter: Siempre tiene sesión activa
      if (room === 'starter') {
        currentSession = await getOrCreateStarterSession();
        currentSession.prize_linea = prizeConfig.prize_linea;
        currentSession.prize_bingo = prizeConfig.prize_bingo;
        currentSession.has_jackpot = false;
      } else {
        // Otras salas: Buscar sesión activa o crear una "virtual" habilitada
        const [activeSession] = await pool.query(`
          SELECT 
            id, room, start_time, status,
            jackpot_linea, jackpot_bingo, jackpot_pre40,
            total_cards_validated, total_paid_cards, total_gift_cards
          FROM game_sessions
          WHERE room = ? AND status IN ('active', 'pending')
          ORDER BY start_time DESC
          LIMIT 1
        `, [room]);

        if (activeSession.length > 0) {
          currentSession = activeSession[0];
        } else {
          // No hay sesión activa, crear una "virtual" para mostrar que está habilitada
          const nextScheduled = await calculateUpcomingSessions(room, 1);
          if (nextScheduled.length > 0) {
            currentSession = {
              id: null,
              room,
              start_time: nextScheduled[0].start_time,
              status: 'pending',
              jackpot_linea: 0,
              jackpot_bingo: 0,
              jackpot_pre40: 0,
              total_cards_validated: 0,
              total_paid_cards: 0,
              total_gift_cards: 0,
              is_virtual: true
            };
          }
        }
      }

      // Calcular próximas sesiones
      const upcomingSessions = await calculateUpcomingSessions(room, 10);

      roomsData.push({
        room,
        currentSession,
        upcomingSessions: upcomingSessions.slice(0, 10),
        prizeConfig
      });
    }

    res.json({
      success: true,
      rooms: roomsData
    });

  } catch (error) {
    console.error('Error obteniendo sesiones activas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sesiones activas'
    });
  }
};

/**
 * GET /api/admin/sessions/recent
 * Obtener historial reciente de sesiones completadas
 */
exports.getRecentSessions = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [sessions] = await pool.query(`
      SELECT 
        id,
        room,
        start_time,
        created_at,
        status,
        jackpot_linea,
        jackpot_bingo,
        jackpot_pre40,
        total_cards_validated,
        total_paid_cards,
        total_gift_cards,
        updated_at
      FROM game_sessions
      WHERE status = 'completed'
      ORDER BY updated_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({
      success: true,
      sessions,
      total: sessions.length
    });

  } catch (error) {
    console.error('Error obteniendo sesiones recientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sesiones recientes'
    });
  }
};

/**
 * GET /api/admin/sessions/:id/live
 * Obtener estado en vivo de una sesión
 */
exports.getLiveSession = async (req, res) => {
  try {
    const { id } = req.params;

    const [sessions] = await pool.query(`
      SELECT 
        gs.*,
        (SELECT COUNT(*) FROM cards_played WHERE session_id = gs.id) as total_players,
        (SELECT COUNT(DISTINCT user_id) FROM cards_played WHERE session_id = gs.id) as unique_players
      FROM game_sessions gs
      WHERE gs.id = ?
    `, [id]);

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }

    const session = sessions[0];

    // Obtener bolas cantadas
    const [balls] = await pool.query(`
      SELECT number, called_at
      FROM drawn_numbers
      WHERE session_id = ?
      ORDER BY called_at ASC
    `, [id]);

    // Obtener ganadores
    const [winners] = await pool.query(`
      SELECT 
        w.id,
        w.user_id,
        w.prize_type,
        w.prize_amount,
        w.ball_number,
        w.created_at,
        u.username
      FROM winners w
      JOIN users u ON w.user_id = u.id
      WHERE w.session_id = ?
      ORDER BY w.created_at DESC
    `, [id]);

    res.json({
      success: true,
      session,
      balls: balls.map(b => b.number),
      ballsDetailed: balls,
      winners,
      stats: {
        total_balls: balls.length,
        total_players: session.total_players,
        unique_players: session.unique_players,
        total_winners: winners.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo sesión en vivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener sesión en vivo'
    });
  }
};

/**
 * POST /api/superadmin/sessions/create
 * Crear nueva sesión de juego (SuperAdmin only)
 */
exports.createSession = async (req, res) => {
  try {
    const {
      room,
      play_date,
      start_time,
      card_price,
      initial_pot_linea = 0,
      initial_pot_bingo = 0,
      initial_pot_pre40 = 0,
      is_preventa = false
    } = req.body;

    // Validaciones
    if (!room || !play_date || !start_time || !card_price) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    if (!['bronce', 'plata', 'oro', 'free_starter'].includes(room)) {
      return res.status(400).json({
        success: false,
        message: 'Sala inválida'
      });
    }

    // Calcular sale_closes_at (5 minutos antes del start_time)
    const sale_closes_at = new Date(`${play_date} ${start_time}`);
    sale_closes_at.setMinutes(sale_closes_at.getMinutes() - 5);

    const [result] = await pool.query(`
      INSERT INTO game_sessions (
        room,
        play_date,
        start_time,
        card_price,
        jackpot_linea,
        jackpot_bingo,
        jackpot_pre40,
        is_preventa,
        sale_closes_at,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      room,
      play_date,
      start_time,
      card_price,
      initial_pot_linea,
      initial_pot_bingo,
      initial_pot_pre40,
      is_preventa ? 1 : 0,
      sale_closes_at
    ]);

    res.json({
      success: true,
      message: 'Sesión creada exitosamente',
      sessionId: result.insertId
    });

  } catch (error) {
    console.error('Error creando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear sesión'
    });
  }
};

/**
 * PUT /api/superadmin/sessions/:id
 * Actualizar sesión programada (SuperAdmin only)
 */
exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      play_date,
      start_time,
      card_price,
      is_preventa
    } = req.body;

    // Verificar que la sesión existe y no está activa
    const [sessions] = await pool.query(
      'SELECT status FROM game_sessions WHERE id = ?',
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }

    if (['active', 'playing', 'completed'].includes(sessions[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar una sesión activa o completada'
      });
    }

    const updates = [];
    const values = [];

    if (play_date) {
      updates.push('play_date = ?');
      values.push(play_date);
    }
    if (start_time) {
      updates.push('start_time = ?');
      values.push(start_time);
    }
    if (card_price !== undefined) {
      updates.push('card_price = ?');
      values.push(card_price);
    }
    if (is_preventa !== undefined) {
      updates.push('is_preventa = ?');
      values.push(is_preventa ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    values.push(id);

    await pool.query(
      `UPDATE game_sessions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Sesión actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar sesión'
    });
  }
};

/**
 * DELETE /api/superadmin/sessions/:id
 * Eliminar sesión programada (SuperAdmin only)
 */
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la sesión existe y no está activa
    const [sessions] = await pool.query(
      'SELECT status, total_cards_validated FROM game_sessions WHERE id = ?',
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }

    if (['active', 'playing', 'completed'].includes(sessions[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una sesión activa o completada'
      });
    }

    if (sessions[0].total_cards_validated > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una sesión con cartones vendidos'
      });
    }

    await pool.query('DELETE FROM game_sessions WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Sesión eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar sesión'
    });
  }
};

/**
 * POST /api/superadmin/sessions/:id/pause
 * Pausar sorteo de una sesión en juego (SuperAdmin only)
 */
exports.pauseSession = async (req, res) => {
  try {
    const { id } = req.params;

    const [sessions] = await pool.query(
      'SELECT status FROM game_sessions WHERE id = ?',
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }

    if (sessions[0].status !== 'playing') {
      return res.status(400).json({
        success: false,
        message: 'La sesión no está en juego'
      });
    }

    // Pausar el motor de juego (esto debe comunicarse con gameEngineAuto)
    const gameEngine = require('../services/gameEngineAuto');
    if (gameEngine.pauseGame) {
      gameEngine.pauseGame(id);
    }

    res.json({
      success: true,
      message: 'Sesión pausada exitosamente'
    });

  } catch (error) {
    console.error('Error pausando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al pausar sesión'
    });
  }
};

/**
 * POST /api/superadmin/sessions/:id/resume
 * Reanudar sorteo de una sesión pausada (SuperAdmin only)
 */
exports.resumeSession = async (req, res) => {
  try {
    const { id } = req.params;

    const [sessions] = await pool.query(
      'SELECT status FROM game_sessions WHERE id = ?',
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }

    // Reanudar el motor de juego
    const gameEngine = require('../services/gameEngineAuto');
    if (gameEngine.resumeGame) {
      gameEngine.resumeGame(id);
    }

    res.json({
      success: true,
      message: 'Sesión reanudada exitosamente'
    });

  } catch (error) {
    console.error('Error reanudando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reanudar sesión'
    });
  }
};
