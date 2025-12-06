/**
 * RANKING ENGINE - "Club 24K"
 * Liga de vendedores con ranking semanal y medallas de logros
 */

const pool = require('../db');
const notificationService = require('./notificationService');

// ========== DEFINICIÓN DE LOGROS ==========
const ACHIEVEMENTS = {
  RECRUITER_MASTER: {
    type: 'recruiter_master',
    name: 'Reclutador Maestro',
    description: 'Tener 10 Sub-Agentes activos',
    criteria: { subAgentsRequired: 10 },
    bonusDiscount: 0.05, // 5% descuento (pagas 65% en vez del 70%)
    icon: '🏅'
  },
  WHALE_HUNTER: {
    type: 'whale_hunter',
    name: 'Ballena Hunter',
    description: 'Tener un jugador que gaste más de $100.000 en un mes',
    criteria: { playerSpendingRequired: 100000 },
    bonusDiscount: 0,
    singleBonus: true, // Bono único de caja
    icon: '🐋'
  },
  NIGHT_SELLER: {
    type: 'night_seller',
    name: 'Vendedor Nocturno',
    description: 'Vender más de 500 cartones en la sala Oro (22hs)',
    criteria: { cardsRequiredOroNight: 500, timeRange: '22:00-23:59' },
    bonusDiscount: 0,
    icon: '🌙'
  }
};

/**
 * Registrar venta para tracking de ranking
 * @param {number} agentId - ID del agente
 * @param {number} cardsSold - Cantidad de cartones vendidos
 * @param {number} totalRevenue - Ingresos totales
 * @param {string} room - Sala de juego
 */
async function recordSale(agentId, cardsSold, totalRevenue, room = null) {
  try {
    const weekStartDate = getWeekStart(new Date());
    
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // Obtener o crear entrada de ranking para esta semana
      const [rankingResult] = await connection.query(
        `SELECT id FROM agent_rankings 
         WHERE agent_id = ? AND week_start_date = ?`,
        [agentId, weekStartDate]
      );

      if (rankingResult.length === 0) {
        // Primera venta de la semana
        await connection.query(
          `INSERT INTO agent_rankings 
           (agent_id, week_start_date, total_sales_cards, total_sales_revenue)
           VALUES (?, ?, ?, ?)`,
          [agentId, weekStartDate, cardsSold, totalRevenue]
        );
      } else {
        // Actualizar ventas existentes
        await connection.query(
          `UPDATE agent_rankings
           SET total_sales_cards = total_sales_cards + ?,
               total_sales_revenue = total_sales_revenue + ?,
               updated_at = NOW()
           WHERE agent_id = ? AND week_start_date = ?`,
          [cardsSold, totalRevenue, agentId, weekStartDate]
        );
      }

      await connection.query('COMMIT');

      return {
        success: true,
        cardsSold,
        totalRevenue,
        room
      };

    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('❌ Error in recordSale:', err);
    throw err;
  }
}

/**
 * Calcular y actualizar ranking semanal (Ejecutar cada lunes 00:00)
 * @returns {object} - Top 3 y zona de descenso
 */
async function calculateWeeklyRanking() {
  try {
    const weekStartDate = getWeekStart(new Date());
    
    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // Obtener vendedores ordenados por ventas
      const [rankingResult] = await connection.query(
        `SELECT id, agent_id, total_sales_cards, total_sales_revenue
         FROM agent_rankings
         WHERE week_start_date = ?
         ORDER BY total_sales_cards DESC, total_sales_revenue DESC`,
        [weekStartDate]
      );

      const rankings = rankingResult;
      const top3Agents = rankings.slice(0, 3);

      // Actualizar ranking y bonos
      for (let i = 0; i < rankings.length; i++) {
        const ranking = rankings[i];
        const position = i + 1;
        let zone = 'normal';
        let bonusChips = 0;
        let isTopPerformer = false;

        if (position <= 3) {
          zone = 'oro';
          bonusChips = 5000; // Premio: 5.000 fichas
          isTopPerformer = true;
        } else if (position > rankings.length * 0.7) {
          zone = 'descenso'; // Últimas posiciones
        }

        await connection.query(
          `UPDATE agent_rankings
           SET ranking_position = ?, zone = ?, bonus_chips_awarded = ?, is_top_performer = ?
           WHERE id = ?`,
          [position, zone, bonusChips, isTopPerformer, ranking.id]
        );

        // Acreditar fichas a Top 3
        if (isTopPerformer) {
          await connection.query(
            `UPDATE users
             SET balance = balance + ?
             WHERE id = ?`,
            [bonusChips, ranking.agent_id]
          );
        }
      }

      await connection.query('COMMIT');

      // Broadcast de Top 3 a todos los jugadores
      for (let i = 0; i < top3Agents.length && i < 3; i++) {
        const agent = top3Agents[i];
        const position = i + 1;
        
        // Obtener username del agente
        const [userRes] = await pool.query(
          'SELECT username FROM users WHERE id = ?',
          [agent.agent_id]
        );
        
        if (userRes.length > 0) {
          const username = userRes[0].username;
          notificationService.broadcastAgentRank(
            username,
            position,
            agent.total_sales_cards
          );
        }
      }

      return {
        weekStart: weekStartDate,
        top3: top3Agents.map((r, i) => ({
          position: i + 1,
          agentId: r.agent_id,
          cardsSold: r.total_sales_cards,
          revenue: r.total_sales_revenue,
          bonusAwarded: 5000,
          icon: '🏆'
        })),
        totalAgents: rankings.length
      };

    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('❌ Error in calculateWeeklyRanking:', err);
    throw err;
  }
}

/**
 * Obtener ranking semanal actual
 * @param {string} weekStartDate - Fecha de inicio de semana (opcional)
 * @returns {array} - Ranking de agentes
 */
async function getWeeklyRanking(weekStartDate = null) {
  try {
    const date = weekStartDate || getWeekStart(new Date());

    const [result] = await pool.query(
      `SELECT ar.agent_id, u.username, ar.total_sales_cards, ar.total_sales_revenue,
              ar.ranking_position, ar.zone, ar.bonus_chips_awarded, ar.is_top_performer
       FROM agent_rankings ar
       JOIN users u ON u.id = ar.agent_id
       WHERE ar.week_start_date = ?
       ORDER BY ar.ranking_position ASC`,
      [date]
    );

    return result.map((row, idx) => ({
      position: idx + 1,
      agentId: row.agent_id,
      username: row.username,
      cardsSold: row.total_sales_cards,
      revenue: parseFloat(row.total_sales_revenue),
      zone: row.zone,
      bonusAwarded: row.bonus_chips_awarded,
      isTopPerformer: row.is_top_performer,
      badge: row.zone === 'oro' ? '🏆' : row.zone === 'descenso' ? '⚠️' : null
    }));

  } catch (err) {
    console.error('❌ Error in getWeeklyRanking:', err);
    throw err;
  }
}

/**
 * Desbloquear logro para agente
 * @param {number} agentId - ID del agente
 * @param {string} achievementType - Tipo de logro
 * @returns {object} - Logro desbloqueado con premios
 */
async function unlockAchievement(agentId, achievementType) {
  try {
    const achievement = ACHIEVEMENTS[achievementType.toUpperCase()];
    if (!achievement) {
      return { success: false, error: 'Logro no encontrado' };
    }

    const connection = await pool.getConnection();
    try {
      await connection.query('START TRANSACTION');

      // Verificar si ya existe
      const [existingResult] = await connection.query(
        `SELECT id FROM agent_achievements 
         WHERE agent_id = ? AND achievement_type = ?`,
        [agentId, achievement.type]
      );

      if (existingResult.length > 0) {
        return { success: false, error: 'Logro ya desbloqueado' };
      }

      // Insertar logro
      const [insertResult] = await connection.query(
        `INSERT INTO agent_achievements 
         (agent_id, achievement_type, achievement_name, description, criteria, bonus_discount, unlocked_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [agentId, achievement.type, achievement.name, achievement.description, 
         JSON.stringify(achievement.criteria), achievement.bonusDiscount]
      );

      const achievementId = insertResult.insertId;

      // Aplicar bonificaciones
      if (achievement.bonusDiscount > 0) {
        // Descuento en fichas: pagas 65% en vez del 70%
        // Esto se aplicará en próximas compras de fichas
      }

      if (achievement.singleBonus) {
        // Bono único de caja (5000 fichas)
        await connection.query(
          `UPDATE users SET balance = balance + 5000 WHERE id = ?`,
          [agentId]
        );
      }

      await connection.query('COMMIT');

      return {
        success: true,
        achievement: {
          name: achievement.name,
          icon: achievement.icon,
          bonusDiscount: achievement.bonusDiscount,
          singleBonus: achievement.singleBonus ? 5000 : null
        }
      };

    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('❌ Error in unlockAchievement:', err);
    throw err;
  }
}

/**
 * Obtener logros del agente
 * @param {number} agentId - ID del agente
 * @returns {array} - Logros desbloqueados
 */
async function getAgentAchievements(agentId) {
  try {
    const [result] = await pool.query(
      `SELECT achievement_type, achievement_name, description, bonus_discount, unlocked_at
       FROM agent_achievements
       WHERE agent_id = ?
       ORDER BY unlocked_at DESC`,
      [agentId]
    );

    return result.map(row => ({
      type: row.achievement_type,
      name: row.achievement_name,
      description: row.description,
      bonusDiscount: parseFloat(row.bonus_discount),
      unlockedAt: row.unlocked_at,
      icon: ACHIEVEMENTS[row.achievement_type.toUpperCase()]?.icon || '⭐'
    }));

  } catch (err) {
    console.error('❌ Error in getAgentAchievements:', err);
    throw err;
  }
}

/**
 * Obtener estadísticas del agente
 * @param {number} agentId - ID del agente
 * @returns {object} - Estadísticas de ventas y logros
 */
async function getAgentStats(agentId) {
  try {
    const weekStartDate = getWeekStart(new Date());

    const [weeklyResult, achievementsResult] = await Promise.all([
      pool.query(
        `SELECT total_sales_cards, total_sales_revenue, ranking_position, zone
         FROM agent_rankings
         WHERE agent_id = ? AND week_start_date = ?`,
        [agentId, weekStartDate]
      ).then(([rows]) => rows),
      getAgentAchievements(agentId)
    ]);

    const weekly = weeklyResult[0];

    return {
      weeklyStats: weekly ? {
        cardsSold: weekly.total_sales_cards,
        revenue: parseFloat(weekly.total_sales_revenue),
        ranking: weekly.ranking_position,
        zone: weekly.zone
      } : null,
      achievements: achievementsResult,
      achievementCount: achievementsResult.length
    };

  } catch (err) {
    console.error('❌ Error in getAgentStats:', err);
    throw err;
  }
}

/**
 * Helper: Obtener inicio de semana (lunes)
 * @param {Date} date - Fecha a procesar
 * @returns {string} - YYYY-MM-DD del lunes
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

/**
 * Verificar si agente tiene derecho al logro "Reclutador Maestro"
 * @param {number} agentId - ID del agente
 */
async function checkRecruiterMaster(agentId) {
  try {
    const [result] = await pool.query(
      `SELECT COUNT(*) as subagent_count FROM users 
       WHERE parent_id = ? AND role = 'agente'`,
      [agentId]
    );

    const count = parseInt(result[0].subagent_count);
    if (count >= 10) {
      return unlockAchievement(agentId, 'recruiter_master');
    }

    return { success: false, requirementNotMet: true };

  } catch (err) {
    console.error('❌ Error in checkRecruiterMaster:', err);
    throw err;
  }
}

module.exports = {
  recordSale,
  calculateWeeklyRanking,
  getWeeklyRanking,
  unlockAchievement,
  getAgentAchievements,
  getAgentStats,
  checkRecruiterMaster,
  ACHIEVEMENTS,
  getWeekStart
};
