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
    const { type, limit = 50, offset = 0 } = req.query;

    const history = {};

    // 1. MOVIMIENTOS DE TICKETS (Compras al agente)
    if (!type || type === 'tickets') {
      const [ticketsMovements] = await pool.query(`
        SELECT 
          id,
          movement_type,
          room,
          quantity,
          created_at,
          description
        FROM tickets_movements
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, parseInt(limit), parseInt(offset)]);

      history.ticketsMovements = ticketsMovements;
    }

    // 2. CARTONES CANJEADOS (Para sorteos)
    if (!type || type === 'cards') {
      const [cardsExchanged] = await pool.query(`
        SELECT 
          cp.id,
          cp.serial,
          cp.card_data,
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
        LIMIT ? OFFSET ?
      `, [userId, parseInt(limit), parseInt(offset)]);

      // Parsear card_data JSON
      history.cardsExchanged = cardsExchanged.map(card => ({
        ...card,
        card_data: card.card_data ? JSON.parse(card.card_data) : null
      }));
    }

    // 3. SORTEOS EN LOS QUE PARTICIPÓ
    if (!type || type === 'sessions') {
      const [participatedSessions] = await pool.query(`
        SELECT DISTINCT
          sh.id as history_id,
          sh.game_session_id,
          sh.room,
          sh.draw_date,
          sh.draw_time,
          sh.winner_linea_username,
          sh.winner_bingo_username,
          sh.linea_ball_number,
          sh.linea_ball_index,
          sh.bingo_ball_number,
          sh.bingo_ball_index,
          sh.ball_sequence,
          sh.prize_linea,
          sh.prize_bingo,
          sh.total_cards,
          (SELECT COUNT(*) FROM bingo_cards_pool 
           WHERE selected_by = ? AND game_session_id = sh.game_session_id) as my_cards_count
        FROM session_history sh
        WHERE EXISTS (
          SELECT 1 FROM bingo_cards_pool cp
          WHERE cp.game_session_id = sh.game_session_id
          AND cp.selected_by = ?
        )
        ORDER BY sh.draw_date DESC, sh.draw_time DESC
        LIMIT ? OFFSET ?
      `, [userId, userId, parseInt(limit), parseInt(offset)]);

      // Parsear ball_sequence JSON
      history.participatedSessions = participatedSessions.map(session => ({
        ...session,
        ball_sequence: session.ball_sequence ? JSON.parse(session.ball_sequence) : [],
        is_winner_linea: session.winner_linea_username === req.user.username,
        is_winner_bingo: session.winner_bingo_username === req.user.username
      }));
    }

    // 4. PREMIOS GANADOS
    if (!type || type === 'prizes') {
      const [prizesWon] = await pool.query(`
        SELECT 
          gw.id,
          gw.game_session_id,
          gw.prize_type,
          gw.prize_amount,
          gw.payment_status,
          gw.payment_method,
          gw.payment_details,
          gw.claimed_at,
          gw.paid_at,
          gs.room,
          gs.start_time as session_date,
          cp.serial as card_serial
        FROM game_winners gw
        INNER JOIN game_sessions gs ON gw.game_session_id = gs.id
        LEFT JOIN bingo_cards_pool cp ON gw.card_id = cp.id
        WHERE gw.user_id = ?
        ORDER BY gw.claimed_at DESC
        LIMIT ? OFFSET ?
      `, [userId, parseInt(limit), parseInt(offset)]);

      history.prizesWon = prizesWon.map(prize => ({
        ...prize,
        payment_details: prize.payment_details ? JSON.parse(prize.payment_details) : null
      }));
    }

    // 5. SOLICITUDES DE RETIRO
    if (!type || type === 'withdrawals') {
      const [withdrawals] = await pool.query(`
        SELECT 
          id,
          amount,
          payment_method,
          payment_details,
          status,
          created_at,
          processed_at,
          processed_by,
          notes
        FROM withdrawal_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, parseInt(limit), parseInt(offset)]);

      history.withdrawals = withdrawals.map(w => ({
        ...w,
        payment_details: w.payment_details ? JSON.parse(w.payment_details) : null
      }));
    }

    // 6. MOVIMIENTOS DE BALANCE (Chips/Dinero)
    if (!type || type === 'balance') {
      const [balanceMovements] = await pool.query(`
        SELECT 
          id,
          movement_type,
          amount,
          balance_before,
          balance_after,
          description,
          created_at
        FROM chips_movements
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [userId, parseInt(limit), parseInt(offset)]);

      history.balanceMovements = balanceMovements;
    }

    // 7. RESUMEN ESTADÍSTICO
    if (!type) {
      const [summary] = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM tickets_movements WHERE user_id = ?) as total_ticket_purchases,
          (SELECT COUNT(*) FROM bingo_cards_pool WHERE selected_by = ?) as total_cards_used,
          (SELECT COUNT(DISTINCT game_session_id) FROM bingo_cards_pool 
           WHERE selected_by = ? AND game_session_id IS NOT NULL) as sessions_played,
          (SELECT COUNT(*) FROM game_winners WHERE user_id = ?) as prizes_won,
          (SELECT COALESCE(SUM(prize_amount), 0) FROM game_winners 
           WHERE user_id = ? AND payment_status = 'paid') as total_prizes_paid,
          (SELECT COUNT(*) FROM withdrawal_requests 
           WHERE user_id = ? AND status = 'approved') as withdrawals_approved
      `, [userId, userId, userId, userId, userId, userId]);

      history.summary = summary[0];
    }

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
