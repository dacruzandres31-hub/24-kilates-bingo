/**
 * STARTER ROOM ROUTES
 * Rutas específicas para la Sala Starter
 */

const express = require('express');
const router = express.Router();
const starterRoomController = require('../controllers/starterRoomController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Middleware de autenticación opcional para testing
const optionalAuth = (req, res, next) => {
  // Intentar autenticar
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  // Si hay token válido (no null, no undefined, no vacío)
  if (token && token !== 'null' && token !== 'undefined') {
    // Si hay token, usar auth normal
    return authenticateToken(req, res, next);
  } else {
    // Si no hay token válido, crear usuario mock para testing
    req.user = {
      id: 999,
      username: 'testing_user',
      role: 'superadmin'  // Permitir testing de admin endpoints
    };
    next();
  }
};

/**
 * GET /api/game/starter/available-cards/:sessionId
 * Obtiene cartones disponibles para selección
 */
router.get('/available-cards/:sessionId', optionalAuth, (req, res) => {
  starterRoomController.getAvailableCards(req, res);
});

/**
 * GET /api/game/starter/my-cards/:sessionId
 * Obtiene cartones ya reservados por el jugador actual
 */
router.get('/my-cards/:sessionId', optionalAuth, (req, res) => {
  starterRoomController.getMyCards(req, res);
});

/**
 * POST /api/game/starter/reserve-cards
 * Reserva cartones seleccionados por el jugador
 * Body: { sessionId, cardIds: [] }
 */
router.post('/reserve-cards', optionalAuth, (req, res) => {
  starterRoomController.reserveCards(req, res);
});

/**
 * POST /api/game/starter/credit-tickets
 * Acredita tickets de Starter en el inventario del jugador
 * Body: { quantity: 20 }
 */
router.post('/credit-tickets', optionalAuth, (req, res) => {
  starterRoomController.creditTickets(req, res);
});

/**
 * POST /api/game/starter/auto-assign-cards/:sessionId
 * Asigna automáticamente 20 cartones al jugador si no tiene ninguno
 */
router.post('/auto-assign-cards/:sessionId', optionalAuth, (req, res) => {
  starterRoomController.autoAssignCards(req, res);
});

/**
 * GET /api/game/starter/session-stats/:sessionId
 * Obtiene estadísticas de la sesión (jugadores, cartones, etc)
 */
router.get('/session-stats/:sessionId', optionalAuth, (req, res) => {
  starterRoomController.getSessionStats(req, res);
});

/**
 * POST /api/game/starter/initialize-session
 * Inicializa nueva sesión con pool de cartones (solo admin)
 * Body: { sessionId, gameStartTime, totalCards }
 */
router.post('/initialize-session', optionalAuth, (req, res) => {
  starterRoomController.initializeSession(req, res);
});

module.exports = router;
