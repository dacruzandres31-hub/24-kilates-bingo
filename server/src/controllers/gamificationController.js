/**
 * GAMIFICATION CONTROLLER - "Club 24K"
 * Endpoints para acceder a datos de gamificación
 */

const gamificationEngine = require('../services/gamification_engine');
const questManager = require('../services/quest_manager');
const rankingEngine = require('../services/ranking_engine');
const notificationService = require('../services/notificationService');
const pool = require('../db');

/**
 * GET /api/gamification/progress
 * Obtener progreso de XP y nivel del jugador actual
 */
exports.getPlayerProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const progress = await gamificationEngine.getPlayerProgress(userId);

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('❌ getPlayerProgress error:', error);
    res.status(500).json({ error: 'Error al obtener progreso' });
  }
};

/**
 * GET /api/gamification/levels
 * Obtener configuración de todos los niveles
 */
exports.getLevels = async (req, res) => {
  try {
    const levels = gamificationEngine.getAllLevels();

    res.json({
      success: true,
      levels
    });

  } catch (error) {
    console.error('❌ getLevels error:', error);
    res.status(500).json({ error: 'Error al obtener niveles' });
  }
};

/**
 * GET /api/gamification/next-level
 * Obtener requisitos para próximo nivel
 */
exports.getNextLevelRequirement = async (req, res) => {
  try {
    const userId = req.user.id;

    const requirement = await gamificationEngine.getNextLevelRequirement(userId);

    res.json({
      success: true,
      data: requirement
    });

  } catch (error) {
    console.error('❌ getNextLevelRequirement error:', error);
    res.status(500).json({ error: 'Error al obtener requisito' });
  }
};

/**
 * GET /api/gamification/top-players
 * Obtener top 10 jugadores por XP
 */
exports.getTopPlayers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const players = await gamificationEngine.getTopPlayers(limit);

    res.json({
      success: true,
      topPlayers: players
    });

  } catch (error) {
    console.error('❌ getTopPlayers error:', error);
    res.status(500).json({ error: 'Error al obtener top players', details: error.message });
  }
};

/**
 * GET /api/gamification/quests
 * Obtener misiones actuales del jugador
 */
exports.getPlayerQuests = async (req, res) => {
  try {
    const userId = req.user.id;
    const questDate = req.query.date; // opcional, default hoy

    const quests = await questManager.getPlayerQuests(userId, questDate);

    res.json({
      success: true,
      quests
    });

  } catch (error) {
    console.error('❌ getPlayerQuests error:', error);
    res.status(500).json({ error: 'Error al obtener misiones' });
  }
};

/**
 * GET /api/gamification/quest-stats
 * Obtener estadísticas de misiones del día
 */
exports.getQuestStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await questManager.getQuestStats(userId);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ getQuestStats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

/**
 * GET /api/gamification/ranking/weekly
 * Obtener ranking semanal de agentes
 */
exports.getWeeklyRanking = async (req, res) => {
  try {
    const weekStartDate = req.query.week; // opcional

    const ranking = await rankingEngine.getWeeklyRanking(weekStartDate);

    res.json({
      success: true,
      ranking,
      totalAgents: ranking.length
    });

  } catch (error) {
    console.error('❌ getWeeklyRanking error:', error);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
};

/**
 * POST /api/gamification/claim-streak
 * Reclamar premio de racha (Giro de ruleta)
 */
exports.claimStreakReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const prize = await gamificationEngine.spinDailyWheel(userId);

    res.json({
      success: true,
      prize
    });
  } catch (error) {
    console.error('Claim Streak Error:', error.message);
    res.status(400).json({ error: error.message });
  }
};



/**
 * GET /api/gamification/agent/:agentId/stats
 * Obtener estadísticas del agente (ranking + logros)
 */
exports.getAgentStats = async (req, res) => {
  try {
    const agentId = req.params.agentId;

    const stats = await rankingEngine.getAgentStats(agentId);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ getAgentStats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

/**
 * GET /api/gamification/ranking/global
 * Obtener Top 5 jugadores globales
 */
exports.getTopPlayers = async (req, res) => {
  try {
    const leaderboard = await gamificationEngine.getTopPlayers();
    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('❌ getTopPlayers error:', error);
    res.status(500).json({ error: 'Error al obtener leaderboard' });
  }
};

/**
 * GET /api/gamification/achievements
 * Obtener todos los logros del jugador
 */
exports.getPlayerAchievements = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT a.code, a.title, a.description, a.icon_url, 
                    ua.current_value, a.target_value, ua.is_completed, ua.completed_at
             FROM achievements a
             LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
             ORDER BY ua.is_completed DESC, a.id ASC`,
      [userId]
    );

    res.json({
      success: true,
      achievements: rows
    });
  } catch (error) {
    console.error('Get Achievements Error:', error);
    res.status(500).json({ error: 'Error getting achievements' });
  }
};

/**
 * GET /api/gamification/agent/:agentId/achievements
 * Obtener logros del agente
 */
exports.getAgentAchievements = async (req, res) => {
  try {
    const agentId = req.params.agentId;

    const achievements = await rankingEngine.getAgentAchievements(agentId);

    res.json({
      success: true,
      achievements,
      totalAchievements: achievements.length
    });

  } catch (error) {
    console.error('❌ getAgentAchievements error:', error);
    res.status(500).json({ error: 'Error al obtener logros' });
  }
};

/**
 * POST /api/gamification/admin/initialize-player
 * [ADMIN ONLY] Inicializar progreso para nuevo usuario
 */
exports.initializePlayerProgress = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { userId } = req.body;

    await gamificationEngine.initializePlayerProgress(userId);

    res.json({
      success: true,
      message: 'Progreso inicializado'
    });

  } catch (error) {
    console.error('❌ initializePlayerProgress error:', error);
    res.status(500).json({ error: 'Error al inicializar' });
  }
};

/**
 * POST /api/gamification/admin/unlock-achievement
 * [ADMIN ONLY] Desbloquear logro manualmente (testing)
 */
exports.unlockAchievementAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { agentId, achievementType } = req.body;

    const result = await rankingEngine.unlockAchievement(agentId, achievementType);

    // Obtener datos del agente para la notificación
    if (result.success) {
      const db = require('../db');
      const [agentResult] = await db.query('SELECT username FROM users WHERE id = ?', [agentId]);

      if (agentResult.length > 0) {
        const username = agentResult[0].username;
        const achievementNames = {
          'RECLUTADOR_MAESTRO': 'Reclutador Maestro',
          'BALLENA_HUNTER': 'Ballena Hunter',
          'VENDEDOR_NOCTURNO': 'Vendedor Nocturno'
        };
        const name = achievementNames[achievementType] || achievementType;

        // Broadcast de logro desbloqueado
        notificationService.broadcastAchievement(username, name, '🏅');
      }
    }

    res.json(result);

  } catch (error) {
    console.error('❌ unlockAchievementAdmin error:', error);
    res.status(500).json({ error: 'Error al desbloquear' });
  }
};


/**
 * GET /api/gamification/admin/stats
 * [SUPERADMIN] Estadísticas globales de gamificación
 */
exports.getGlobalGamificationStats = async (req, res) => {
  try {
    const pool = require('../db'); // Import DB directly if needed or via engine
    // Assuming 'pool' is available or imported in file header. Checking file header...
    // Just in case, using query via gamificationEngine logic or direct DB access.
    // Since this file doesn't seem to import 'pool' at top level (based on view), I'll check gamification_engine usage or add import.
    // Looking at file, imports are not shown. I'll use common pattern.

    // Quick DB query directly for aggregate stats
    const db = require('../db');

    const [streakStats] = await db.query(`
      SELECT COUNT(*) as active_streaks, MAX(current_streak) as max_streak 
      FROM user_streaks WHERE current_streak > 0
    `);

    const [achStats] = await db.query(`
      SELECT COUNT(*) as total_unlocked, 
             (SELECT COUNT(DISTINCT user_id) FROM user_achievements) as users_with_achievements
      FROM user_achievements WHERE is_completed = 1
    `);

    const [xpStats] = await db.query(`
      SELECT SUM(current_xp) as total_xp_distributed, AVG(level) as avg_level 
      FROM users WHERE level > 1
    `);

    res.json({
      success: true,
      stats: {
        activeStreaks: streakStats[0].active_streaks || 0,
        maxStreak: streakStats[0].max_streak || 0,
        achievementsUnlocked: achStats[0].total_unlocked || 0,
        usersWithAchievements: achStats[0].users_with_achievements || 0,
        totalXp: xpStats[0].total_xp_distributed || 0,
        avgLevel: Math.round(xpStats[0].avg_level || 1)
      }
    });

  } catch (error) {
    console.error('❌ getGlobalGamificationStats error:', error);
    res.status(500).json({ error: 'Error obteniendo estadísticas globales' });
  }
};


/**
 * GET /api/gamification/admin/player/:userId
 * [SUPERADMIN] Obtener detalles completos de gamificación de un jugador
 */
exports.getPlayerGamificationDetails = async (req, res) => {
  try {
    const userId = req.params.userId;
    const db = require('../db');

    // 1. Basic Stats (Level, XP)
    const [userRows] = await db.query('SELECT level, current_xp FROM users WHERE id = ?', [userId]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRows[0];

    // 2. Achievements
    const [achievements] = await db.query(`
      SELECT a.name, a.description, a.icon, ua.completed_at 
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ? AND ua.is_completed = 1
      ORDER BY ua.completed_at DESC
    `, [userId]);

    // 3. Streak
    const [streak] = await db.query('SELECT current_streak, last_login_date FROM user_streaks WHERE user_id = ?', [userId]);

    // 4. Quests Today
    const [quests] = await db.query(`
      SELECT count(*) as total, sum(completed) as completed 
      FROM daily_quests 
      WHERE user_id = ? AND quest_date = CURDATE()
    `, [userId]);

    res.json({
      success: true,
      stats: {
        level: user.level,
        currentXp: user.current_xp,
        achievementsCount: achievements.length,
        recentAchievements: achievements.slice(0, 3), // Last 3
        currentStreak: streak.length > 0 ? streak[0].current_streak : 0,
        questProgress: quests.length > 0 ? `${quests[0].completed || 0}/${quests[0].total}` : '0/0'
      }
    });

  } catch (error) {
    console.error('❌ getPlayerGamificationDetails error:', error);
    res.status(500).json({ error: 'Error getting player details' });
  }
};

exports.spinWheel = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await gamificationEngine.spinFortuneWheel(userId);
    res.json({ success: true, prize: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getWheelStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    // We can reuse getPlayerProgress or make a dedicated query.
    // Making a lightweight query here for speed
    const pool = require('../db');
    const [rows] = await pool.query('SELECT last_wheel_spin FROM users WHERE id = ?', [userId]);

    if (rows.length === 0) return res.status(404).json({ success: false });

    const lastSpin = rows[0].last_wheel_spin;
    let canSpin = true;
    let nextSpinTime = null;

    if (lastSpin) {
      const now = new Date();
      const last = new Date(lastSpin);
      const diffMs = now - last;
      const hours = diffMs / (1000 * 60 * 60);

      if (hours < 24) {
        canSpin = false;
        nextSpinTime = new Date(last.getTime() + (24 * 60 * 60 * 1000));
      }
    }

    res.json({
      success: true,
      canSpin,
      nextSpinTime,
      serverTime: new Date()
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = exports;
