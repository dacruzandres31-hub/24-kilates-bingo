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
        COALESCE(gs.current_pot_linea, 0) AS current_pot_linea,
        COALESCE(gs.current_pot_bingo, 0) AS current_pot_bingo,
        COALESCE(gs.total_cards_sold, 0) AS cards_sold,
        gs.status,
        gs.id AS session_id
      FROM room_settings rs
      LEFT JOIN game_sessions gs ON gs.room = rs.room 
        AND gs.status IN ('active', 'playing', 'pending')
      ORDER BY FIELD(rs.room, 'bronce', 'plata', 'oro')
    `);

    // Sala Starter
    const [starterSession] = await pool.query(`
      SELECT 
        id AS session_id,
        room,
        total_cards_sold AS cards_sold,
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

    // Emitir a todos los clientes conectados
    io.emit('pots_updated', {
      pots: allPots,
      timestamp: new Date().toISOString()
    });

    console.log('📡 [WebSocket] pots_updated emitido a todos los clientes');
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

module.exports = {
  initialize,
  emitPotsUpdate,
  emitSessionUpdate,
  emitGlobalNotification,
  emitPersonalNotification
};
