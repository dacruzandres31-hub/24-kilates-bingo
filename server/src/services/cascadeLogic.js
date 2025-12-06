const pool = require('../db');

/**
 * CASCADE LOGIC - Lógica de Cascada del Jackpot
 * 
 * Regla: Si ganan BINGO después de bolilla 40, el JACKPOT se transfiere
 * a la próxima sesión de la misma sala (cascada).
 * 
 * Proceso:
 * 1. Detectar si ganador fue después de bolilla 40
 * 2. Obtener próxima sesión (mismo room)
 * 3. Transferir monto con auditoría
 * 4. Registrar transacción
 */

class CascadeLogic {
  /**
   * Transfiere el jackpot a la próxima sesión
   * @param {number} currentSessionId - ID de sesión actual con bingo
   * @param {string} roomType - room_type (bronce|plata|oro|free_starter)
   * @returns {object} Resultado de transferencia
   */
  static async transferJackpot(currentSessionId, roomType) {
    const connection = await pool.getConnection();

    try {
      await connection.query('START TRANSACTION');

      // 1. Obtener sesión actual
      const [currentSessionResult] = await connection.query(
        `SELECT id, current_pot_jackpot, created_at, room 
         FROM game_sessions WHERE id = ?`,
        [currentSessionId]
      );

      if (currentSessionResult.length === 0) {
        throw new Error('Sesión actual no encontrada');
      }

      const currentSession = currentSessionResult[0];
      const jackpotAmount = currentSession.current_pot_jackpot;

      // 2. Buscar próxima sesión (mismo room, más reciente después de la actual)
      const [nextSessionResult] = await connection.query(
        `SELECT id FROM game_sessions 
         WHERE room = ? AND created_at > ? AND status IN ('pending', 'active')
         ORDER BY created_at ASC LIMIT 1`,
        [roomType, currentSession.created_at]
      );

      let nextSessionId;

      if (nextSessionResult.length === 0) {
        // Si no existe sesión siguiente, crear una
        const [createSessionResult] = await connection.query(
          `INSERT INTO game_sessions 
           (room, start_time, status, current_pot_bingo, current_pot_linea, current_pot_jackpot, jackpot_source_id)
           VALUES (?, DATE_ADD(NOW(), INTERVAL 2 HOUR), 'pending', 0, 0, ?, ?)`,
          [roomType, jackpotAmount, currentSessionId]
        );
        nextSessionId = createSessionResult.insertId;
      } else {
        nextSessionId = nextSessionResult[0].id;

        // 3. Transferir jackpot a próxima sesión
        await connection.query(
          `UPDATE game_sessions 
           SET current_pot_jackpot = current_pot_jackpot + ?,
               jackpot_source_id = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [jackpotAmount, currentSessionId, nextSessionId]
        );
      }

      // 4. Registrar en auditoría (money trail)
      await connection.query(
        `INSERT INTO audit_revenue 
         (amount, transaction_type)
         VALUES (?, ?)`,
        [jackpotAmount, 'jackpot_cascade']
      );

      // 5. Resetear jackpot de sesión actual (ya transferido)
      await connection.query(
        `UPDATE game_sessions 
         SET current_pot_jackpot = 0
         WHERE id = ?`,
        [currentSessionId]
      );

      await connection.query('COMMIT');

      return {
        success: true,
        transferred: jackpotAmount,
        fromSession: currentSessionId,
        toSession: nextSessionId,
        message: `Jackpot de $${jackpotAmount} transferido a próxima sesión`
      };
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('Cascade transfer error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene el histórico de cascadas de jackpot
   * @param {string} roomType - Tipo de sala para filtrar
   * @returns {array} Cascadas históricas
   */
  static async getCascadeHistory(roomType) {
    try {
      const [result] = await pool.query(
        `SELECT gs1.id as source_session_id, gs1.current_pot_bingo as original_jackpot,
                gs2.id as target_session_id, gs2.current_pot_jackpot as current_jackpot,
                gs1.created_at as cascade_date
         FROM game_sessions gs1
         LEFT JOIN game_sessions gs2 ON gs1.id = gs2.jackpot_source_id
         WHERE gs1.room = ? AND gs1.status = 'completed' AND gs1.jackpot_source_id IS NOT NULL
         ORDER BY gs1.created_at DESC
         LIMIT 50`,
        [roomType]
      );

      return result;
    } catch (error) {
      console.error('Get cascade history error:', error);
      throw error;
    }
  }

  /**
   * Obtiene el jackpot acumulado actual para una sala
   * @param {string} roomType - Tipo de sala
   * @returns {number} Monto acumulado de jackpot
   */
  static async getCurrentJackpot(roomType) {
    try {
      const [result] = await pool.query(
        `SELECT COALESCE(SUM(current_pot_jackpot), 0) as total_jackpot
         FROM game_sessions 
         WHERE room = ? AND status IN ('pending', 'active')`,
        [roomType]
      );

      return result[0].total_jackpot;
    } catch (error) {
      console.error('Get current jackpot error:', error);
      throw error;
    }
  }

  /**
   * Computa estadísticas de cascadas (para dashboard admin)
   * @returns {object} Estadísticas por sala
   */
  static async getCascadeStats() {
    try {
      const [result] = await pool.query(
        `SELECT 
           room,
           COUNT(DISTINCT id) as total_sessions,
           COUNT(DISTINCT jackpot_source_id) as total_cascades,
           SUM(current_pot_jackpot) as total_accumulated_jackpot
         FROM game_sessions
         WHERE status = 'completed'
         GROUP BY room`
      );

      return result;
    } catch (error) {
      console.error('Get cascade stats error:', error);
      throw error;
    }
  }
}

module.exports = CascadeLogic;
