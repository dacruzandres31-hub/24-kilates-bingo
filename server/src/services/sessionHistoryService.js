const pool = require('../db');

/**
 * Servicio para archivar sesiones completadas en el historial
 * Guarda:
 * - Ganadores de LÍNEA y BINGO
 * - Cartones participantes
 * - Secuencia de bolillas
 * - Bolilla en que salió LÍNEA y BINGO
 */

/**
 * Archivar una sesión completada
 * @param {number} gameSessionId - ID de la sesión completada
 * @returns {Promise<object>} - Resultado del archivado
 */
async function archiveSession(gameSessionId) {
  try {
    // Obtener datos de la sesión
    const [sessions] = await pool.query(`
      SELECT 
        id, room, start_time, status,
        current_pot_linea, current_pot_bingo, current_pot_jackpot,
        total_cards_validated, total_paid_cards, total_gift_cards,
        linea_ball_number, linea_ball_index,
        bingo_ball_number, bingo_ball_index,
        ball_sequence, archived
      FROM game_sessions
      WHERE id = ?
    `, [gameSessionId]);

    if (sessions.length === 0) {
      throw new Error(`Sesión ${gameSessionId} no encontrada`);
    }

    const session = sessions[0];

    // Verificar que esté completada
    if (session.status !== 'completed' && session.status !== 'finished') {
      throw new Error(`Sesión ${gameSessionId} no está completada (status: ${session.status})`);
    }

    // Verificar que no haya sido archivada antes
    if (session.archived) {
      return {
        success: true,
        message: 'Sesión ya archivada anteriormente',
        already_archived: true
      };
    }

    // Obtener cartones participantes
    const [cards] = await pool.query(`
      SELECT 
        c.id as card_id,
        c.user_id,
        u.username,
        c.payment_type
      FROM bingo_cards c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.game_session_id = ?
    `, [gameSessionId]);

    const participatingCards = cards.map(card => ({
      card_id: card.card_id,
      user_id: card.user_id,
      username: card.username || 'Desconocido',
      payment_type: card.payment_type
    }));

    // Buscar ganadores (si hay cartones ganadores guardados)
    const [winnerLineaCards] = await pool.query(`
      SELECT user_id FROM bingo_cards 
      WHERE game_session_id = ? AND is_winner_linea = 1
      LIMIT 1
    `, [gameSessionId]);

    const [winnerBingoCards] = await pool.query(`
      SELECT user_id FROM bingo_cards 
      WHERE game_session_id = ? AND is_winner_bingo = 1
      LIMIT 1
    `, [gameSessionId]);

    const winnerLineaUserId = winnerLineaCards.length > 0 ? winnerLineaCards[0].user_id : null;
    const winnerBingoUserId = winnerBingoCards.length > 0 ? winnerBingoCards[0].user_id : null;

    // Obtener usernames de ganadores
    let winnerLineaUsername = null;
    let winnerBingoUsername = null;

    if (winnerLineaUserId) {
      const [lineaUser] = await pool.query('SELECT username FROM users WHERE id = ?', [winnerLineaUserId]);
      winnerLineaUsername = lineaUser.length > 0 ? lineaUser[0].username : null;
    }

    if (winnerBingoUserId) {
      const [bingoUser] = await pool.query('SELECT username FROM users WHERE id = ?', [winnerBingoUserId]);
      winnerBingoUsername = bingoUser.length > 0 ? bingoUser[0].username : null;
    }

    // Extraer fecha y hora del sorteo
    const startTime = new Date(session.start_time);
    const drawDate = startTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const drawTime = startTime.toTimeString().split(' ')[0]; // HH:MM:SS

    // Insertar en session_history
    const [result] = await pool.query(`
      INSERT INTO session_history (
        game_session_id, room, draw_date, draw_time,
        winner_linea_user_id, winner_linea_username,
        winner_bingo_user_id, winner_bingo_username,
        linea_ball_number, linea_ball_index,
        bingo_ball_number, bingo_ball_index,
        ball_sequence, participating_cards,
        prize_linea, prize_bingo, prize_jackpot,
        total_cards, total_paid_cards, total_gift_cards
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?
      )
    `, [
      gameSessionId, session.room, drawDate, drawTime,
      winnerLineaUserId, winnerLineaUsername,
      winnerBingoUserId, winnerBingoUsername,
      session.linea_ball_number, session.linea_ball_index,
      session.bingo_ball_number, session.bingo_ball_index,
      session.ball_sequence ? JSON.stringify(session.ball_sequence) : null,
      JSON.stringify(participatingCards),
      session.current_pot_linea, session.current_pot_bingo, session.current_pot_jackpot,
      session.total_cards_validated, session.total_paid_cards, session.total_gift_cards
    ]);

    // Marcar sesión como archivada
    await pool.query('UPDATE game_sessions SET archived = 1 WHERE id = ?', [gameSessionId]);

    return {
      success: true,
      message: 'Sesión archivada exitosamente',
      history_id: result.insertId,
      archived_data: {
        session_id: gameSessionId,
        room: session.room,
        draw_date: drawDate,
        draw_time: drawTime,
        total_cards: participatingCards.length,
        winner_linea: winnerLineaUsername,
        winner_bingo: winnerBingoUsername
      }
    };

  } catch (error) {
    console.error('Error archivando sesión:', error);
    throw error;
  }
}

/**
 * Obtener historial de sesiones por sala
 * @param {string} room - Sala (starter, bronce, plata, oro)
 * @param {number} limit - Número de registros a retornar
 * @returns {Promise<array>} - Lista de sesiones archivadas
 */
async function getSessionHistory(room = null, limit = 50) {
  try {
    let query = `
      SELECT 
        id, game_session_id, room, draw_date, draw_time,
        winner_linea_username, winner_bingo_username,
        linea_ball_number, linea_ball_index,
        bingo_ball_number, bingo_ball_index,
        prize_linea, prize_bingo, prize_jackpot,
        total_cards, total_paid_cards, total_gift_cards,
        created_at
      FROM session_history
    `;

    const params = [];
    if (room) {
      query += ' WHERE room = ?';
      params.push(room);
    }

    query += ' ORDER BY draw_date DESC, draw_time DESC LIMIT ?';
    params.push(limit);

    const [history] = await pool.query(query, params);
    return history;

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    throw error;
  }
}

/**
 * Obtener detalle completo de una sesión archivada
 * @param {number} historyId - ID del registro en session_history
 * @returns {Promise<object>} - Detalle completo
 */
async function getSessionHistoryDetail(historyId) {
  try {
    const [history] = await pool.query(`
      SELECT * FROM session_history WHERE id = ?
    `, [historyId]);

    if (history.length === 0) {
      throw new Error(`Registro de historial ${historyId} no encontrado`);
    }

    const record = history[0];

    // Parsear JSON
    return {
      ...record,
      ball_sequence: record.ball_sequence ? JSON.parse(record.ball_sequence) : [],
      participating_cards: record.participating_cards ? JSON.parse(record.participating_cards) : []
    };

  } catch (error) {
    console.error('Error obteniendo detalle de historial:', error);
    throw error;
  }
}

/**
 * Archivar todas las sesiones completadas que no han sido archivadas
 * @returns {Promise<object>} - Resultado del proceso
 */
async function archiveAllCompleted() {
  try {
    // Buscar sesiones completadas no archivadas
    const [sessions] = await pool.query(`
      SELECT id FROM game_sessions 
      WHERE status IN ('completed', 'finished') 
      AND archived = 0
    `);

    const results = {
      total: sessions.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const session of sessions) {
      try {
        await archiveSession(session.id);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          session_id: session.id,
          error: error.message
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Error archivando sesiones completadas:', error);
    throw error;
  }
}

module.exports = {
  archiveSession,
  getSessionHistory,
  getSessionHistoryDetail,
  archiveAllCompleted
};
