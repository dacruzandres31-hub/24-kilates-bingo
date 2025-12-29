/**
 * WebSocket Service - Notificaciones en Tiempo Real
 * Gestión centralizada de eventos Socket.IO
 */

let io = null;

/**
 * Inicializar el servicio con la instancia de Socket.IO
 * @param {SocketIO.Server} socketIoInstance 
 */
function initialize(socketIoInstance) {
  io = socketIoInstance;
  console.log('✅ [WebSocket] Servicio de notificaciones inicializado');
}

/**
 * Emitir actualización de pozos a todos los clientes
 * Se ejecuta cuando:
 * - Se vende un cartón
 * - Se modifica configuración de sala
 * - Se resetea pozo acumulado
 */
async function emitPotsUpdate() {
  if (!io) {
    console.warn('⚠️ [WebSocket] Socket.IO no inicializado, no se puede emitir pots_updated');
    return;
  }

  try {
    // Obtener pozos actuales
    const pool = require('../db');
    const roomSettingsController = require('../controllers/roomSettingsController');

    // Obtener pozos usando el mismo método que el endpoint
    const [moneyPots] = await pool.query(`
      SELECT 
        rs.room,
        rs.card_price,
        rs.accumulated_pot_pre40 AS jackpot,
        COALESCE(latest.jackpot_linea, 0) AS current_pot_linea,
        COALESCE(latest.jackpot_bingo, 0) AS current_pot_bingo,
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
      ) latest ON latest.room COLLATE utf8mb4_unicode_ci = rs.room COLLATE utf8mb4_unicode_ci
      ORDER BY FIELD(rs.room, 'bronce', 'plata', 'oro')
    `);

    // Sala Starter
    const [starterSession] = await pool.query(`
      SELECT 
        id AS session_id,
        room,
        total_cards_validated AS cards_sold,
        status
      FROM game_sessions
      WHERE room = 'free_starter' 
        AND status IN ('active', 'playing', 'pending')
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const starterPot = {
      room: 'starter',
      card_price: 0,
      jackpot: 0,
      current_pot_linea: 'Ticket Bronce',
      current_pot_bingo: 'Ticket Oro',
      cards_sold: starterSession.length > 0 ? starterSession[0].cards_sold : 0,
      status: starterSession.length > 0 ? starterSession[0].status : 'no_session',
      session_id: starterSession.length > 0 ? starterSession[0].session_id : null,
      is_special: true
    };

    const allPots = [starterPot, ...moneyPots];

    // Emitir a todos los clientes conectados (Lobby / Admin)
    io.emit('pots_updated', {
      pots: allPots,
      timestamp: new Date().toISOString()
    });

    // NUEVO: Emitir actualización específica por sala y por sesión para sincronización v2.0
    moneyPots.forEach(p => {
      const data = {
        potBingo: parseFloat(p.current_pot_bingo),
        potLinea: parseFloat(p.current_pot_linea),
        potJackpot: parseFloat(p.jackpot)
      };

      // Emitir a sala genérica (retrocompatibilidad)
      io.to(`room_${p.room}`).emit('pot_update', data);

      // Emitir a sesión específica (Sincronización v2.0)
      if (p.session_id) {
        io.to(`session_${p.session_id}`).emit('pot_update', data);
      }
    });

    // Emitir para Starter
    if (starterPot.session_id) {
      io.to(`session_${starterPot.session_id}`).emit('pot_update', {
        potBingo: 'Ticket Oro',
        potLinea: 'Ticket Bronce',
        potJackpot: 0
      });
    }

    console.log('📡 [WebSocket] pots_updated y pot_update emitidos');
  } catch (error) {
    console.error('❌ [WebSocket] Error al emitir pots_updated:', error);
  }
}

/**
 * Emitir actualización de sesión específica
 * @param {number} sessionId 
 */
async function emitSessionUpdate(sessionId) {
  if (!io) return;

  try {
    const pool = require('../db');
    const [session] = await pool.query(
      'SELECT * FROM game_sessions WHERE id = ?',
      [sessionId]
    );

    if (session.length > 0) {
      io.to(`session_${sessionId}`).emit('session_updated', {
        session: session[0],
        timestamp: new Date().toISOString()
      });

      console.log(`📡 [WebSocket] session_updated emitido para sesión ${sessionId}`);
    }
  } catch (error) {
    console.error('❌ [WebSocket] Error al emitir session_updated:', error);
  }
}

/**
 * Emitir notificación global a todos los administradores
 * @param {string} message 
 * @param {string} type - 'info' | 'warning' | 'error' | 'success'
 */
function emitGlobalNotification(message, type = 'info') {
  if (!io) return;

  io.to('admins').emit('global_notification', {
    message,
    type,
    timestamp: new Date().toISOString()
  });

  console.log(`📡 [WebSocket] global_notification emitida: ${message}`);
}

/**
 * Emitir notificación personal a un usuario específico
 * @param {number} userId 
 * @param {object} data 
 */
function emitPersonalNotification(userId, data) {
  if (!io) return;

  io.to(`user_${userId}`).emit('personal_notification', {
    ...data,
    timestamp: new Date().toISOString()
  });

  console.log(`📡 [WebSocket] personal_notification enviada a usuario ${userId}`);
}

/**
 * Emitir alerta de pozo caliente
 * @param {string} room 
 * @param {string} type - 'bingo' | 'pre40'
 * @param {number} amount 
 */
function emitHotPotAlert(room, type, amount) {
  if (!io) return;

  io.emit('hot_pot_alert', {
    room,
    type,
    amount,
    timestamp: new Date().toISOString()
  });

  console.log(`🔥 [WebSocket] hot_pot_alert emitida para ${room}: ${type} $${amount}`);
}

module.exports = {
  initialize,
  emitPotsUpdate,
  emitSessionUpdate,
  emitGlobalNotification,
  emitPersonalNotification,
  emitHotPotAlert
};
