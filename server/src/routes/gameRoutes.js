const express = require('express');
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GAME ROUTES
 * POST   /game/buy-card              - Comprar cartón
 * GET    /game/my-cards              - Obtener mis cartones
 * POST   /game/finish-session        - Terminar partida
 * GET    /game/sessions/:id          - Estado de sesión
 * GET    /game/sessions              - Sesiones activas
 * POST   /game/end-free-game         - Procesar premios Sala Starter
 */

// Todos requieren autenticación
router.use(authMiddleware.authenticateToken);

// Comprar cartón
router.post('/buy-card', gameController.buyCard);

// Comprar cartón gratis (Sala Starter)
router.post('/buy-card-free', gameController.buyCardFree);

// Reclamar premio en Sala Starter
router.post('/claim-free-prize', gameController.claimFreePrize);

// NUEVO: Procesar premio al terminar partida Sala Starter (LÍNEA/BINGO)
router.post('/end-free-game', gameController.end_free_game);

// Obtener cartones del jugador
router.get('/my-cards', gameController.getPlayerCards);

// Terminar sesión (admin/SuperAdmin)
router.post('/finish-session', gameController.finishSession);

// Estado de sesión específica
router.get('/sessions/:sessionId', gameController.getSessionStatus);

// Sesiones activas
router.get('/sessions', gameController.getActiveSessions);

module.exports = router;
