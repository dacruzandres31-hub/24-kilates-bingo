/**
 * GAMIFICATION CONTROLLER - "Club 24K"
 * Endpoints para acceder a datos de gamificación
 */

const gamificationEngine = require('../services/gamification_engine');
const questManager = require('../services/quest_manager');
const rankingEngine = require('../services/ranking_engine');
const notificationService = require('../services/notificationService');

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
    const limit = req.query.limit || 10;

    const players = await gamificationEngine.getTopPlayers(limit);

    res.json({
      success: true,
      players
    });

  } catch (error) {
    console.error('❌ getTopPlayers error:', error);
    res.status(500).json({ error: 'Error al obtener top players' });
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

module.exports = exports;
