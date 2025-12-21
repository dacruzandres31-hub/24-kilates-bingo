/**
 * ACTIVITY HISTORY CONTROLLER
 * 
 * Gestiona el historial completo de actividad del jugador:
 * - Compra de tickets
 * - Cartones canjeados para sorteos
 * - Sorteos en los que participó
 * - Premios ganados y retiros
 */

const pool = require('../db');

/**
 * GET /api/users/activity-history
 * Obtiene historial completo de actividad del usuario autenticado
 */
exports.getActivityHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[ActivityHistory] Obteniendo historial para usuario:', userId);

    const history = {
      cards: [],
      prizes: [],
      movements: [],
      summary: {
        totalCards: 0,
        totalPrizes: 0,
        totalWinnings: 0
      }
    };

    // 1. CARTONES JUGADOS
    try {
      const [cardsPlayed] = await pool.query(`
        SELECT 
          cp.id,
          cp.card_serial as serial,
          cp.room,
          cp.is_gift,
          cp.selected_at,
          cp.game_session_id,
          gs.start_time as session_start,
          gs.status as session_status
        FROM bingo_cards_pool cp
        LEFT JOIN game_sessions gs ON cp.game_session_id = gs.id
        WHERE cp.selected_by = ?
        ORDER BY cp.selected_at DESC
        LIMIT 50
      `, [userId]);

      history.cards = cardsPlayed;
      history.summary.totalCards = cardsPlayed.length;
    } catch (err) {
      console.error('[ActivityHistory] Error en cartones:', err.message);
    }

    // 2. PREMIOS GANADOS
    try {
      const [prizes] = await pool.query(`
        SELECT 
          gw.id,
          gw.game_session_id,
          gw.prize_type,
          gw.prize_amount,
          gw.payment_status,
          gw.claimed_at,
          gw.paid_at,
          gs.room,
          gs.start_time as session_date
        FROM game_winners gw
        INNER JOIN game_sessions gs ON gw.game_session_id = gs.id
        WHERE gw.user_id = ?
        ORDER BY gw.claimed_at DESC
        LIMIT 50
      `, [userId]);

      history.prizes = prizes;
      history.summary.totalPrizes = prizes.length;
      history.summary.totalWinnings = prizes.reduce((sum, p) => sum + parseFloat(p.prize_amount || 0), 0);
    } catch (err) {
      console.error('[ActivityHistory] Error en premios:', err.message);
    }

    // 3. MOVIMIENTOS DE FICHAS
    try {
      const [movements] = await pool.query(`
        SELECT 
          id,
          movement_type,
          amount,
          description,
          created_at
        FROM chips_movements
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);

      history.movements = movements;
    } catch (err) {
      console.error('[ActivityHistory] Error en movimientos:', err.message);
    }

    console.log('[ActivityHistory] Historial completo para usuario', userId);

    res.json({
      success: true,
      userId,
      username: req.user.username,
      history
    });

  } catch (error) {
    console.error('[ActivityHistory] Error obteniendo historial:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener historial de actividad' 
    });
  }
};

/**
 * GET /api/users/activity-history/session/:sessionId
 * Detalle completo de un sorteo específico en el que participó
 */
exports.getSessionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // Verificar que el usuario participó en esta sesión
    const [participated] = await pool.query(`
      SELECT COUNT(*) as count
      FROM bingo_cards_pool
      WHERE selected_by = ? AND game_session_id = ?
    `, [userId, sessionId]);

    if (participated[0].count === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'No participaste en este sorteo' 
      });
    }

    // Obtener detalles del sorteo
    const [sessionInfo] = await pool.query(`
      SELECT 
        sh.*,
        gs.room,
        gs.card_price,
        gs.current_pot_linea,
        gs.current_pot_bingo
      FROM session_history sh
      INNER JOIN game_sessions gs ON sh.game_session_id = gs.id
      WHERE sh.game_session_id = ?
    `, [sessionId]);

    if (sessionInfo.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sorteo no encontrado' 
      });
    }

    const session = sessionInfo[0];
    session.ball_sequence = session.ball_sequence ? JSON.parse(session.ball_sequence) : [];

    // Mis cartones en este sorteo
    const [myCards] = await pool.query(`
      SELECT 
        id,
        serial,
        card_data,
        is_gift,
        selected_at
      FROM bingo_cards_pool
      WHERE selected_by = ? AND game_session_id = ?
      ORDER BY selected_at ASC
    `, [userId, sessionId]);

    session.my_cards = myCards.map(card => ({
      ...card,
      card_data: card.card_data ? JSON.parse(card.card_data) : null
    }));

    // Mis premios en este sorteo
    const [myPrizes] = await pool.query(`
      SELECT 
        prize_type,
        prize_amount,
        payment_status,
        claimed_at,
        paid_at
      FROM game_winners
      WHERE user_id = ? AND game_session_id = ?
    `, [userId, sessionId]);

    session.my_prizes = myPrizes;

    res.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('[ActivityHistory] Error obteniendo detalle de sesión:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al obtener detalle del sorteo' 
    });
  }
};

module.exports = exports;
