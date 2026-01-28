const pool = require('../db');

/**
 * GET /api/superadmin/room-settings
 * Obtener configuración de todas las salas
 */
exports.getRoomSettings = async (req, res) => {
  try {
    const [settings] = await pool.query(`
      SELECT 
        room,
        card_price,
        percentage_linea,
        percentage_bingo,
        percentage_acumulado,
        accumulated_pot_pre40,
        updated_at
      FROM room_settings
      ORDER BY FIELD(room, 'bronce', 'plata', 'oro')
    `);

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('[RoomSettings] Error al obtener configuración:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de salas'
    });
  }
};

/**
 * PUT /api/superadmin/room-settings/:room
 * Actualizar precio de cartón de una sala
 */
exports.updateRoomPrice = async (req, res) => {
  try {
    const { room } = req.params;
    const { card_price } = req.body;
    const userId = req.user.id;

    // Validaciones
    if (!['bronce', 'plata', 'oro'].includes(room)) {
      return res.status(400).json({
        success: false,
        message: 'Sala inválida. Debe ser: bronce, plata u oro'
      });
    }

    if (!card_price || card_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El precio del cartón debe ser mayor a 0'
      });
    }

    // Actualizar precio
    await pool.query(
      `UPDATE room_settings 
       SET card_price = ?, updated_by = ? 
       WHERE room = ?`,
      [card_price, userId, room]
    );

    // Obtener configuración actualizada
    const [updated] = await pool.query(
      'SELECT * FROM room_settings WHERE room = ?',
      [room]
    );

    console.log(`[RoomSettings] 💰 Precio actualizado: ${room} → $${card_price}`);

    res.json({
      success: true,
      message: `Precio de sala ${room} actualizado correctamente`,
      setting: updated[0]
    });
  } catch (error) {
    console.error('[RoomSettings] Error al actualizar precio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar precio de sala'
    });
  }
};

/**
 * PUT /api/superadmin/room-settings/:room/percentages
 * Actualizar porcentajes de distribución (LÍNEA, BINGO, ACUMULADO)
 */
exports.updateRoomPercentages = async (req, res) => {
  try {
    const { room } = req.params;
    const { percentage_linea, percentage_bingo, percentage_acumulado } = req.body;
    const userId = req.user.id;

    // Validaciones
    if (!['bronce', 'plata', 'oro'].includes(room)) {
      return res.status(400).json({
        success: false,
        message: 'Sala inválida'
      });
    }

    // Validar que los porcentajes sumen <= 100
    const total = parseFloat(percentage_linea || 0) + 
                  parseFloat(percentage_bingo || 0) + 
                  parseFloat(percentage_acumulado || 0);

    if (total > 100) {
      return res.status(400).json({
        success: false,
        message: `Los porcentajes suman ${total}%, no pueden superar 100%`
      });
    }

    // Actualizar porcentajes
    await pool.query(
      `UPDATE room_settings 
       SET 
         percentage_linea = ?,
         percentage_bingo = ?,
         percentage_acumulado = ?,
         updated_by = ?
       WHERE room = ?`,
      [percentage_linea, percentage_bingo, percentage_acumulado, userId, room]
    );

    const [updated] = await pool.query(
      'SELECT * FROM room_settings WHERE room = ?',
      [room]
    );

    console.log(`[RoomSettings] 📊 Porcentajes actualizados: ${room}`);

    res.json({
      success: true,
      message: 'Porcentajes actualizados correctamente',
      setting: updated[0]
    });
  } catch (error) {
    console.error('[RoomSettings] Error al actualizar porcentajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar porcentajes'
    });
  }
};

/**
 * POST /api/superadmin/room-settings/:room/reset-accumulated
 * Resetear pozo acumulado Pre-40 (solo SuperAdmin)
 */
exports.resetAccumulatedPot = async (req, res) => {
  try {
    const { room } = req.params;
    const userId = req.user.id;

    if (!['bronce', 'plata', 'oro'].includes(room)) {
      return res.status(400).json({
        success: false,
        message: 'Sala inválida'
      });
    }

    // Resetear a 0
    await pool.query(
      `UPDATE room_settings 
       SET accumulated_pot_pre40 = 0.00, updated_by = ? 
       WHERE room = ?`,
      [userId, room]
    );

    console.log(`[RoomSettings] 🔄 Pozo acumulado reseteado: ${room}`);

    res.json({
      success: true,
      message: `Pozo acumulado de ${room} reseteado a $0`
    });
  } catch (error) {
    console.error('[RoomSettings] Error al resetear pozo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al resetear pozo acumulado'
    });
  }
};

/**
 * GET /api/admin/room-settings/current-pots
 * Obtener pozos actuales de todas las salas (para dashboard)
 * Incluye sala Starter con premios especiales (tickets)
 */
exports.getCurrentPots = async (req, res) => {
  try {
    // Obtener pozos de salas con dinero (Bronce, Plata, Oro)
    // Obtener la sesión más reciente de cada sala
    const [moneyPots] = await pool.query(`
      SELECT 
        rs.room,
        rs.card_price,
        rs.accumulated_pot_pre40 AS jackpot,
        COALESCE(latest.current_pot_linea, 0) AS current_pot_linea,
        COALESCE(latest.current_pot_bingo, 0) AS current_pot_bingo,
        COALESCE(latest.total_cards_validated, 0) AS cards_sold,
        latest.status,
        latest.session_id
      FROM room_settings rs
      LEFT JOIN (
        SELECT 
          gs1.*,
          gs1.id AS session_id
        FROM game_sessions gs1
        INNER JOIN (
          SELECT room, MAX(id) AS max_id
          FROM game_sessions
          WHERE status IN ('active', 'playing', 'pending')
          GROUP BY room
        ) gs2 ON gs1.id = gs2.max_id
      ) latest ON latest.room COLLATE utf8mb4_0900_ai_ci = rs.room COLLATE utf8mb4_0900_ai_ci
      ORDER BY FIELD(rs.room, 'bronce', 'plata', 'oro')
    `);

    // Obtener datos de sala Starter (premios en tickets)
    const [starterSession] = await pool.query(`
      SELECT 
        id AS session_id,
        room,
        total_cards_validated AS cards_sold,
        status
      FROM game_sessions
      WHERE room = 'starter' 
        AND status IN ('active', 'playing', 'pending')
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // Construir objeto para sala Starter
    const starterPot = {
      room: 'starter',
      card_price: 0, // Gratis
      jackpot: 0, // No tiene jackpot acumulado
      current_pot_linea: 'Ticket Bronce', // Premio especial
      current_pot_bingo: 'Ticket Oro', // Premio especial
      cards_sold: starterSession.length > 0 ? starterSession[0].cards_sold : 0,
      status: starterSession.length > 0 ? starterSession[0].status : 'no_session',
      session_id: starterSession.length > 0 ? starterSession[0].session_id : null,
      is_special: true // Flag para frontend
    };

    // Combinar todas las salas: Starter primero, luego Bronce, Plata, Oro
    const allPots = [starterPot, ...moneyPots];

    res.json({
      success: true,
      pots: allPots
    });
  } catch (error) {
    console.error('[RoomSettings] Error al obtener pozos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener pozos actuales'
    });
  }
};

/**
 * GET /api/game/lobby-data
 * ENDPOINT PÚBLICO (sin autenticación)
 * Obtener datos para el lobby del jugador: precios + pozos actuales
 * Formato optimizado para CasinoLobby.jsx
 * 
 * CENTRALIZADO: Todo se basa en schedule_settings
 * Estados:
 * - active: Habilitada (más de 5 min antes del sorteo)
 * - sales_closed: Ventas cerradas (5-1 min antes)
 * - starting: Iniciando (1 min antes)
 * - playing: Sorteando (sesión activa)
 * - finishing: Finalizando (0-2 min después)
 * - closed: Cerrada (sin horarios programados)
 */
exports.getLobbyData = async (req, res) => {
  try {
    // Obtener datos de salas monetizadas (Bronce, Plata, Oro)
    // Prioridad: 'playing' > otros estados (para detectar sorteos en curso)
    const [moneyRooms] = await pool.query(`
      SELECT 
        rs.room,
        rs.card_price,
        COALESCE(latest.jackpot_pre40, 0) AS jackpot_pre40_accumulated,
        COALESCE(latest.current_pot_linea, 0) AS current_pot_linea,
        COALESCE(latest.current_pot_bingo, 0) AS current_pot_bingo,
        latest.status,
        latest.id as session_id
      FROM room_settings rs
      LEFT JOIN (
        SELECT 
          gs1.*
        FROM game_sessions gs1
        INNER JOIN (
          SELECT room, 
            -- Priorizar sesiones 'playing' sobre otras
            CASE 
              WHEN MAX(CASE WHEN status = 'playing' THEN id END) IS NOT NULL 
              THEN MAX(CASE WHEN status = 'playing' THEN id END)
              ELSE MAX(id) 
            END AS max_id
          FROM game_sessions
          WHERE status IN ('active', 'playing', 'pending', 'waiting')
          GROUP BY room
        ) gs2 ON gs1.id = gs2.max_id
      ) latest ON latest.room COLLATE utf8mb4_0900_ai_ci = rs.room COLLATE utf8mb4_0900_ai_ci
      WHERE rs.room IN ('bronce', 'plata', 'oro')
      ORDER BY FIELD(rs.room, 'bronce', 'plata', 'oro')
    `);

    // Obtener horarios programados desde schedule_settings
    const [schedules] = await pool.query(`
      SELECT room, day_of_week, hour
      FROM schedule_settings
      WHERE is_active = 1
      ORDER BY room, day_of_week, hour
    `);

    // Función para calcular el próximo sorteo basado en schedule_settings
    const getNextScheduledTime = (roomSchedules) => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Domingo, 6 = Sábado
      const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

      let nextTime = null;
      let minDiff = Infinity;

      roomSchedules.forEach(schedule => {
        const [hour, minute, second] = schedule.hour.split(':').map(Number);
        const scheduleTime = hour * 3600 + minute * 60 + (second || 0);
        
        // Calcular diferencia en días y segundos
        let dayDiff = schedule.day_of_week - currentDay;
        let timeDiff = scheduleTime - currentTime;

        // Si es el mismo día pero la hora ya pasó, buscar en la próxima semana
        if (dayDiff === 0 && timeDiff <= 0) {
          dayDiff = 7;
        }
        
        // Si es un día anterior de la semana, agregar días hasta la próxima semana
        if (dayDiff < 0) {
          dayDiff += 7;
        }

        // Calcular diferencia total en segundos
        const totalDiff = dayDiff * 86400 + timeDiff;

        if (totalDiff > 0 && totalDiff < minDiff) {
          minDiff = totalDiff;
          const nextDate = new Date(now);
          nextDate.setDate(nextDate.getDate() + dayDiff);
          nextDate.setHours(hour, minute, second || 0, 0);
          nextTime = nextDate;
        }
      });

      return { nextTime, secondsToStart: minDiff === Infinity ? null : minDiff };
    };

    // Función para calcular estado y si ventas están abiertas basándose en schedule_settings
    const calculateRoomState = (roomSchedules, sessionStatus) => {
      // Si hay sesión activa en estado 'playing', está sorteando
      if (sessionStatus === 'playing') {
        return {
          status: 'playing',
          salesOpen: false,
          statusText: 'SORTEANDO',
          minutesToStart: 0
        };
      }

      const { nextTime, secondsToStart } = getNextScheduledTime(roomSchedules || []);
      
      if (!nextTime) {
        return {
          status: 'closed',
          salesOpen: false,
          statusText: 'CERRADA',
          minutesToStart: null,
          nextSession: null
        };
      }

      const minutesToStart = Math.floor(secondsToStart / 60);

      // Determinar estado según tiempo restante
      let status, salesOpen, statusText;
      
      if (minutesToStart > 5) {
        // Más de 5 minutos: Habilitada
        status = 'active';
        salesOpen = true;
        statusText = 'HABILITADA';
      } else if (minutesToStart > 1) {
        // 5-1 minutos: Ventas cerradas
        status = 'sales_closed';
        salesOpen = false;
        statusText = 'VENTAS CERRADAS';
      } else if (minutesToStart > 0) {
        // 1 minuto o menos: Iniciando
        status = 'starting';
        salesOpen = false;
        statusText = 'INICIANDO';
      } else {
        // 0 o negativo: debería estar sorteando o finalizando
        status = 'starting';
        salesOpen = false;
        statusText = 'INICIANDO';
      }

      return {
        status,
        salesOpen,
        statusText,
        minutesToStart,
        nextSession: nextTime.toISOString()
      };
    };

    // Agrupar horarios por sala
    const schedulesByRoom = {};
    schedules.forEach(schedule => {
      if (!schedulesByRoom[schedule.room]) {
        schedulesByRoom[schedule.room] = [];
      }
      schedulesByRoom[schedule.room].push(schedule);
    });

    // Obtener configuración de premios de Starter (usar tabla directamente)
    const [starterConfig] = await pool.query(`
      SELECT prizes_linea, ticket_room_linea, prizes_bingo, ticket_room_bingo
      FROM starter_room_config
      ORDER BY id DESC
      LIMIT 1
    `);

    // Obtener status actual de la sala Starter (priorizar 'playing')
    const [starterStatus] = await pool.query(`
      SELECT status, id
      FROM game_sessions
      WHERE room = 'starter'
        AND status IN ('active', 'playing', 'pending', 'waiting')
      ORDER BY 
        CASE WHEN status = 'playing' THEN 0 ELSE 1 END,
        id DESC
      LIMIT 1
    `);

    // Usar premios de la configuración o valores por defecto
    const starterPrizes = starterConfig.length > 0 ? starterConfig[0] : {
      prizes_linea: 2,
      ticket_room_linea: 'bronce',
      prizes_bingo: 5,
      ticket_room_bingo: 'oro'
    };

    // Calcular estado de Starter
    const starterSessionStatus = starterStatus.length > 0 ? starterStatus[0].status : null;
    const starterState = calculateRoomState(schedulesByRoom['starter'], starterSessionStatus);

    // Formatear respuesta para cada sala
    const lobbyData = {
      starter: {
        price: 0,
        prizes: {
          line: {
            quantity: starterPrizes.prizes_linea,
            room: starterPrizes.ticket_room_linea
          },
          bingo: {
            quantity: starterPrizes.prizes_bingo,
            room: starterPrizes.ticket_room_bingo
          }
        },
        ...starterState,
        sessionId: starterStatus.length > 0 ? starterStatus[0].id : null
      }
    };

    // Agregar datos de salas monetizadas
    moneyRooms.forEach(room => {
      const roomState = calculateRoomState(schedulesByRoom[room.room], room.status);

      lobbyData[room.room] = {
        price: parseFloat(room.card_price),
        pots: {
          bingo: parseFloat(room.current_pot_bingo) || 0,
          line: parseFloat(room.current_pot_linea) || 0,
          pre40: parseFloat(room.jackpot_pre40_accumulated) || 0
        },
        ...roomState,
        sessionId: room.session_id || null
      };
    });

    console.log('[RoomSettings] 📊 Datos del lobby preparados:', JSON.stringify(lobbyData, null, 2));

    res.json({
      success: true,
      data: lobbyData
    });
  } catch (error) {
    console.error('[RoomSettings] Error al obtener datos del lobby:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del lobby'
    });
  }
};
