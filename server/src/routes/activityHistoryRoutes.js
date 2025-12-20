const express = require('express');
const router = express.Router();
const activityHistoryController = require('../controllers/activityHistoryController');
const authMiddleware = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * GET /api/activity-history
 * Historial completo de actividad del usuario
 * Query params:
 * - type: 'tickets', 'cards', 'sessions', 'prizes', 'withdrawals', 'balance' (opcional, sin tipo retorna todo)
 * - limit: número de registros (default 50)
 * - offset: paginación (default 0)
 */
router.get('/', activityHistoryController.getActivityHistory);

/**
 * GET /api/activity-history/session/:sessionId
 * Detalle completo de un sorteo específico
 */
router.get('/session/:sessionId', activityHistoryController.getSessionDetails);

module.exports = router;
