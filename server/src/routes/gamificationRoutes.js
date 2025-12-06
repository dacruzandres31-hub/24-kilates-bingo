/**
 * GAMIFICATION ROUTES - "Club 24K"
 * Rutas para acceder a datos de gamificación
 */

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const gamificationController = require('../controllers/gamificationController');

const router = express.Router();

// ========== RUTAS PÚBLICAS (Requieren autenticación) ==========

/**
 * GET /api/gamification/progress
 * Obtener progreso de XP y nivel del jugador actual
 */
router.get('/progress', authMiddleware.authenticateToken, gamificationController.getPlayerProgress);

/**
 * GET /api/gamification/levels
 * Obtener configuración de todos los niveles
 */
router.get('/levels', authMiddleware.authenticateToken, gamificationController.getLevels);

/**
 * GET /api/gamification/next-level
 * Obtener requisitos para próximo nivel
 */
router.get('/next-level', authMiddleware.authenticateToken, gamificationController.getNextLevelRequirement);

/**
 * GET /api/gamification/top-players
 * Obtener top jugadores por XP
 * Query params: ?limit=10
 */
router.get('/top-players', authMiddleware.authenticateToken, gamificationController.getTopPlayers);

/**
 * GET /api/gamification/quests
 * Obtener misiones del jugador
 * Query params: ?date=YYYY-MM-DD (opcional)
 */
router.get('/quests', authMiddleware.authenticateToken, gamificationController.getPlayerQuests);

/**
 * GET /api/gamification/quest-stats
 * Obtener estadísticas de misiones del día
 */
router.get('/quest-stats', authMiddleware.authenticateToken, gamificationController.getQuestStats);

/**
 * GET /api/gamification/ranking/weekly
 * Obtener ranking semanal de agentes
 * Query params: ?week=YYYY-MM-DD (opcional)
 */
router.get('/ranking/weekly', authMiddleware.authenticateToken, gamificationController.getWeeklyRanking);

/**
 * GET /api/gamification/agent/:agentId/stats
 * Obtener estadísticas del agente
 */
router.get('/agent/:agentId/stats', authMiddleware.authenticateToken, gamificationController.getAgentStats);

/**
 * GET /api/gamification/agent/:agentId/achievements
 * Obtener logros del agente
 */
router.get('/agent/:agentId/achievements', authMiddleware.authenticateToken, gamificationController.getAgentAchievements);

// ========== RUTAS ADMIN ==========

/**
 * POST /api/gamification/admin/initialize-player
 * [SUPERADMIN] Inicializar progreso para nuevo usuario
 * Body: { userId }
 */
router.post('/admin/initialize-player', authMiddleware.authenticateToken, gamificationController.initializePlayerProgress);

/**
 * POST /api/gamification/admin/unlock-achievement
 * [SUPERADMIN] Desbloquear logro manualmente
 * Body: { agentId, achievementType }
 */
router.post('/admin/unlock-achievement', authMiddleware.authenticateToken, gamificationController.unlockAchievementAdmin);

module.exports = router;
