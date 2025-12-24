/**
 * ACTIVITY HISTORY CONTROLLER
 * 
 * Gestiona el historial completo de actividad del jugador:
 * - Movimientos de Tickets
 * - Cartones canjeados
 * - Sorteos participados
 * - Premios ganados
 * - Retiros
 * - Balance
 */

const pool = require('../db');

exports.getActivityHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('[ActivityHistory] Obteniendo historial para usuario:', userId);

    const history = {
      ticketsMovements: [],
      cardsExchanged: [],
      participatedSessions: [],
      prizesWon: [],
      withdrawals: [],
      balanceMovements: [],
      summary: {
        totalCards: 0,
        totalPrizes: 0,
        totalWinnings: 0
      }
    };

    const connection = await pool.getConnection();

    try {
      // 1. TICKETS (game_events)
      // Usamos try-catch individual para que un error en una tabla no rompa todo
      try {
        const [tickets] = await connection.query(`
          SELECT id, event_type, details, created_at 
          FROM game_events 
          WHERE user_id = ? AND event_type LIKE '%ticket%' 
          ORDER BY created_at DESC LIMIT 50
        `, [userId]);

        history.ticketsMovements = tickets.map(t => ({
          ...t,
          description: t.event_type === 'ticket_consumed' ? 'Ticket Consumido' : 'Ticket Obtenido'
        }));
      } catch (err) {
        console.error('[History] Error loading tickets:', err.message);
      }

      // 2. CARTONES CANJEADOS (bingo_cards_pool + game_sessions)
      try {
        const [cards] = await connection.query(`
          SELECT 
            cp.id, cp.card_serial as serial, cp.room, cp.is_gift, cp.selected_at,
            cp.game_session_id, gs.start_time as session_start, gs.status as session_status
          FROM bingo_cards_pool cp
          LEFT JOIN game_sessions gs ON cp.game_session_id = gs.id
          WHERE cp.selected_by = ?
          ORDER BY cp.selected_at DESC LIMIT 50
        `, [userId]);

        history.cardsExchanged = cards;
        history.summary.totalCards = cards.length;
      } catch (err) {
        console.error('[History] Error loading cards:', err.message);
      }

      // 3. SORTEOS PARTICIPADOS
      try {
        const [sessions] = await connection.query(`
          SELECT DISTINCT 
            gs.id, gs.room, gs.start_time, gs.status,
            (SELECT COUNT(*) FROM bingo_cards_pool WHERE game_session_id = gs.id AND selected_by = ?) as my_cards
          FROM game_sessions gs
          INNER JOIN bingo_cards_pool cp ON gs.id = cp.game_session_id
          WHERE cp.selected_by = ?
          ORDER BY gs.start_time DESC LIMIT 20
        `, [userId, userId]);

        history.participatedSessions = sessions;
      } catch (err) {
        console.error('[History] Error loading sessions:', err.message);
      }

      // 4. PREMIOS GANADOS
      try {
        const [prizes] = await connection.query(`
          SELECT 
            gw.id, gw.game_session_id, gw.prize_type, gw.prize_amount, 
            gw.payment_status, gw.claimed_at, gs.room
          FROM game_winners gw
          INNER JOIN game_sessions gs ON gw.game_session_id = gs.id
          WHERE gw.user_id = ?
          ORDER BY gw.claimed_at DESC LIMIT 50
        `, [userId]);

        history.prizesWon = prizes;
        history.summary.totalPrizes = prizes.length;
        history.summary.totalWinnings = prizes.reduce((sum, p) => sum + parseFloat(p.prize_amount || 0), 0);
      } catch (err) {
        console.error('[History] Error loading prizes:', err.message);
      }

      // 5. RETIROS
      try {
        const [withdrawals] = await connection.query(`
          SELECT 
            id, amount, status, method, created_at, processed_at
          FROM withdrawal_requests
          WHERE user_id = ?
          ORDER BY created_at DESC LIMIT 50
        `, [userId]);

        history.withdrawals = withdrawals;
      } catch (err) {
        console.error('[History] Error loading withdrawals:', err.message);
        // Si la tabla withdrawal_requests no existe o tiene otro nombre, esto evitará el 500
      }

      // 6. BALANCE (chips_movements)
      try {
        // NOTA: Usamos 'reason' ya que 'description' podría no existir en chips_movements
        const [movements] = await connection.query(`
          SELECT 
            id, movement_type, amount, reason as description, created_at
          FROM chips_movements
          WHERE user_id = ?
          ORDER BY created_at DESC LIMIT 50
        `, [userId]);

        history.balanceMovements = movements;
      } catch (err) {
        console.error('[History] Error loading balance movements:', err.message);
      }

    } finally {
      connection.release();
    }

    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('[ActivityHistory] Critical Error:', error);
    res.status(500).json({ success: false, error: 'Error interno obteniendo historial' });
  }
};

exports.getSessionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const [participated] = await pool.query(`
      SELECT COUNT(*) as count FROM bingo_cards_pool 
      WHERE selected_by = ? AND game_session_id = ?
    `, [userId, sessionId]);

    if (participated[0].count === 0) {
      return res.status(403).json({ success: false, error: 'No participaste en este sorteo' });
    }

    const [sessionInfo] = await pool.query(`
      SELECT sh.*, gs.room, gs.card_price 
      FROM session_history sh
      INNER JOIN game_sessions gs ON sh.game_session_id = gs.id
      WHERE sh.game_session_id = ?
    `, [sessionId]);

    if (sessionInfo.length === 0) {
      return res.status(404).json({ success: false, error: 'Sorteo no encontrado' });
    }

    const session = sessionInfo[0];
    session.ball_sequence = session.ball_sequence ? JSON.parse(session.ball_sequence) : [];

    const [myCards] = await pool.query(`
      SELECT id, serial, card_data, is_gift, selected_at 
      FROM bingo_cards_pool 
      WHERE selected_by = ? AND game_session_id = ?
    `, [userId, sessionId]);

    session.my_cards = myCards.map(c => ({
      ...c,
      card_data: c.card_data ? JSON.parse(c.card_data) : null
    }));

    const [myPrizes] = await pool.query(`
      SELECT prize_type, prize_amount, payment_status 
      FROM game_winners 
      WHERE user_id = ? AND game_session_id = ?
    `, [userId, sessionId]);

    session.my_prizes = myPrizes;

    res.json({ success: true, session });

  } catch (error) {
    console.error('[ActivityHistory] Error session details:', error);
    res.status(500).json({ success: false, error: 'Error al obtener detalle' });
  }
};

module.exports = exports;
