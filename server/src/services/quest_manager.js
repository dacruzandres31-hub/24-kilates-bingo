/**
 * QUEST MANAGER - "Club 24K"
 * Sistema de misiones diarias y semanales con premios
 */

const pool = require('../db');

// ========== DEFINICIÓN DE MISIONES ==========
const QUESTS_DEFINITIONS = {
  DAILY_ATTENDANCE: {
    type: 'daily_attendance',
    name: 'Asistencia Perfecta',
    description: 'Juega al menos 1 cartón en 3 sorteos seguidos',
    rewardType: 'credits',
    rewardAmount: 500,
    progressTarget: 3,
    category: 'daily'
  },
  EXPLORER: {
    type: 'explorer',
    name: 'Explorador',
    description: 'Juega en la Sala Bronce, Plata y Oro el mismo día',
    rewardType: 'xp_multiplier',
    rewardAmount: 2, // x2 por 24hs
    progressTarget: 3,
    category: 'daily'
  },
  RESURRECTION_BONUS: {
    type: 'mala_racha',
    name: 'Mala Racha (Consuelo)',
    description: 'Si pierdes 10 cartones seguidos sin hacer ni línea',
    rewardType: 'credits',
    rewardAmount: 1000, // "Bono de Resurrección"
    progressTarget: 10,
    category: 'special'
  },
  WEEKLY_HUNTER: {
    type: 'weekly_hunter',
    name: 'Cazador Semanal',
    description: 'Gana 5 premios (cualquier tipo) en la semana',
    rewardType: 'credits',
    rewardAmount: 2000,
    progressTarget: 5,
    category: 'weekly'
  }
};

/**
 * Crear misiones diarias para un jugador
 * @param {number} userId - ID del jugador
 * @param {string} questDate - Fecha (YYYY-MM-DD)
 */
async function createDailyQuests(userId, questDate = null) {
  try {
    const date = questDate || new Date().toISOString().split('T')[0];

    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // Eliminar misiones previas del mismo día para ese usuario
      await connection.query(
        `DELETE FROM daily_quests 
         WHERE user_id = ? AND quest_date = ?`,
        [userId, date]
      );

      // Insertar nuevas misiones
      const questsToInsert = [
        QUESTS_DEFINITIONS.DAILY_ATTENDANCE,
        QUESTS_DEFINITIONS.EXPLORER,
        QUESTS_DEFINITIONS.RESURRECTION_BONUS
      ];

      for (const quest of questsToInsert) {
        await connection.query(
          `INSERT INTO daily_quests 
           (user_id, quest_type, quest_name, target_value, xp_reward, quest_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            userId,
            quest.type,
            quest.name,
            quest.progressTarget,
            quest.rewardAmount || 50,
            date
          ]
        );
      }

      await connection.query('COMMIT');

      return {
        success: true,
        questsCreated: questsToInsert.length,
        date
      };

    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('❌ Error in createDailyQuests:', err);
    throw err;
  }
}

/**
 * Obtener misiones actuales del jugador
 * @param {number} userId - ID del jugador
 * @param {string} questDate - Fecha (default: hoy)
 */
async function getPlayerQuests(userId, questDate = null) {
  try {
    const date = questDate || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      `SELECT id, quest_type, quest_name, completed, 
              xp_reward, current_value, target_value, completed_at
       FROM daily_quests
       WHERE user_id = ? AND quest_date = ?
       ORDER BY completed ASC, quest_name ASC`,
      [userId, date]
    );

    return result.map(row => ({
      questId: row.id,
      type: row.quest_type,
      name: row.quest_name,
      description: `${row.quest_name} - ${row.current_value}/${row.target_value}`,
      isCompleted: row.completed === 1,
      rewardType: 'xp',
      rewardAmount: row.xp_reward,
      progress: {
        current: row.current_value,
        target: row.target_value,
        percent: Math.round((row.current_value / row.target_value) * 100)
      },
      completedAt: row.completed_at
    }));

  } catch (err) {
    console.error('❌ Error in getPlayerQuests:', err);
    throw err;
  }
}

/**
 * Actualizar progreso de misión
 * @param {number} userId - ID del jugador
 * @param {string} questType - Tipo de misión
 * @param {number} increment - Cantidad a incrementar
 * @returns {object} - {completed: boolean, reward: object|null}
 */
async function updateQuestProgress(userId, questType, increment = 1) {
  try {
    const date = new Date().toISOString().split('T')[0];

    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      const [questResult] = await connection.query(
        `SELECT id, progress_current, progress_target, quest_type, xp_reward, completed
         FROM daily_quests
         WHERE user_id = ? AND quest_type = ? AND quest_date = ? AND completed = 0
         LIMIT 1`,
        [userId, questType, date]
      );

      if (questResult.length === 0) {
        return { completed: false, isNew: true };
      }

      const quest = questResult[0];
      const newProgress = Math.min(quest.progress_current + increment, quest.progress_target);
      const isCompleted = newProgress >= quest.progress_target;

      let reward = null;

      if (isCompleted) {
        // Completar misión
        await connection.query(
          `UPDATE daily_quests
           SET is_completed = true, progress_current = ?, completed_at = NOW()
           WHERE id = ?`,
          [newProgress, quest.id]
        );

        // Acreditar premio
        // Derivar tipo de premio según el tipo de misión (hardcodeado según definiciones)
        // daily_attendance, mala_racha, weekly_hunter -> CREDITS
        // explorer -> XP MULTIPLIER

        const isCreditReward = ['daily_attendance', 'mala_racha', 'weekly_hunter'].includes(quest.quest_type);
        const isMultiplierReward = ['explorer'].includes(quest.quest_type);

        if (isCreditReward) {
          await connection.query(
            `UPDATE users SET balance = balance + ? WHERE id = ?`,
            [quest.xp_reward, userId]
          );
          reward = {
            type: 'credits',
            amount: quest.xp_reward
          };
        } else if (isMultiplierReward) {
          reward = {
            type: 'xp_multiplier',
            multiplier: quest.xp_reward,
            duration: '24hs'
          };
        }
      } else {
        // Solo actualizar progreso
        await connection.query(
          `UPDATE daily_quests
           SET progress_current = ?
           WHERE id = ?`,
          [newProgress, quest.id]
        );
      }

      await connection.query('COMMIT');

      return {
        completed: isCompleted,
        progress: {
          current: newProgress,
          target: quest.progress_target,
          percent: Math.round((newProgress / quest.progress_target) * 100)
        },
        reward: isCompleted ? reward : null
      };

    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('❌ Error in updateQuestProgress:', err);
    throw err;
  }
}

/**
 * Registrar pérdida de cartón para track "Mala Racha"
 * @param {number} userId - ID del jugador
 * @param {boolean} hasLine - Si hizo línea o bingo
 */
async function recordCardLoss(userId, hasLine) {
  try {
    if (hasLine) {
      // Resetear contador de pérdidas
      await pool.query(
        `UPDATE daily_quests 
         SET progress_current = 0
         WHERE user_id = ? AND quest_type = 'mala_racha' AND quest_date = CURRENT_DATE`,
        [userId]
      );
      return { progress: 0 };
    } else {
      // Incrementar contador
      return updateQuestProgress(userId, 'mala_racha', 1);
    }

  } catch (err) {
    console.error('❌ Error in recordCardLoss:', err);
    throw err;
  }
}

/**
 * Registrar compra en sala para track "Explorador"
 * @param {number} userId - ID del jugador
 * @param {string} room - Sala (bronce, plata, oro)
 */
async function recordRoomPlay(userId, room) {
  try {
    const date = new Date().toISOString().split('T')[0];

    // Obtener salas jugadas hoy
    const result = await pool.query(
      `SELECT DISTINCT room FROM daily_stock_cards
       WHERE buyer_id = ? AND play_date = ?
       LIMIT 3`,
      [userId, date]
    );

    const roomsPlayed = result[0].map(r => r.room);

    if (roomsPlayed.length >= 3 &&
      roomsPlayed.includes('bronce') &&
      roomsPlayed.includes('plata') &&
      roomsPlayed.includes('oro')) {
      // Completó todas las salas hoy
      return updateQuestProgress(userId, 'explorer', 3);
    }

    return { completed: false };

  } catch (err) {
    console.error('❌ Error in recordRoomPlay:', err);
    throw err;
  }
}

/**
 * Obtener estadísticas de misiones completadas
 * @param {number} userId - ID del jugador
 * @returns {object} - Estadísticas de misiones
 */
async function getQuestStats(userId) {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_quests,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_quests,
        SUM(CASE WHEN completed = 1 AND quest_type IN ('daily_attendance', 'mala_racha', 'weekly_hunter') THEN xp_reward ELSE 0 END) as total_credits_earned
       FROM daily_quests
       WHERE user_id = ? AND quest_date = ?`,
      [userId, new Date().toISOString().split('T')[0]]
    );

    const stats = result[0][0];
    return {
      total: parseInt(stats.total_quests) || 0,
      completed: parseInt(stats.completed_quests) || 0,
      completionPercent: stats.total_quests > 0 ? Math.round((stats.completed_quests / stats.total_quests) * 100) : 0,
      creditsEarned: parseFloat(stats.total_credits_earned) || 0
    };

  } catch (err) {
    console.error('❌ Error in getQuestStats:', err);
    throw err;
  }
}

module.exports = {
  createDailyQuests,
  getPlayerQuests,
  updateQuestProgress,
  recordCardLoss,
  recordRoomPlay,
  getQuestStats,
  QUESTS_DEFINITIONS
};
