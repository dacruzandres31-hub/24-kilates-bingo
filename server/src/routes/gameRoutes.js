const express = require('express');
const gameController = require('../controllers/gameController');
const roomSettingsController = require('../controllers/roomSettingsController');
const authMiddleware = require('../middleware/authMiddleware');
const diagnosticsController = require('../controllers/diagnosticsController');

const router = express.Router();

/**
 * GAME ROUTES
 * GET    /game/lobby-data            - Datos públicos para lobby (precios + pozos)
 * POST   /game/buy-card              - Comprar cartón
 * GET    /game/my-cards              - Obtener mis cartones
 * POST   /game/finish-session        - Terminar partida
 * GET    /game/sessions/:id          - Estado de sesión
 * GET    /game/sessions              - Sesiones activas
 * POST   /game/end-free-game         - Procesar premios Sala Starter
 * GET    /game/session-status/:sessionId - Estado detallado de sesión (para jugadores)
 */

// ENDPOINT PÚBLICO (sin autenticación)
router.get('/lobby-data', roomSettingsController.getLobbyData);

// Todos los siguientes requieren autenticación
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

// Estado detallado de sesión (para jugadores y monitoreo)
router.get('/session-status/:sessionId', diagnosticsController.getSessionStatus);


// Sesiones activas
router.get('/sessions', gameController.getActiveSessions);

// Estado de la sala (siguiente sorteo, sorteando)
router.get('/room-status/:room', gameController.getRoomStatus);

// NUEVO: Cantar línea en salas monetizadas
router.post('/claim-line', gameController.claimLine);

// NUEVO: Cantar BINGO en salas monetizadas
router.post('/claim-bingo', gameController.claimBingo);

// NUEVO: Análisis y ordenamiento inteligente de cartones
router.get('/my-cards-analysis/:gameSessionId', gameController.getMyCardsAnalysis);

// ========================================
// 🎴 INVENTARIO DE CARTONES (v1.4.0)
// Jugadores - Validar y consultar cartones
// ========================================
router.post('/validate-cards', gameController.validateCardsForSession);
router.get('/my-validated-cards/:sessionId', gameController.getMyValidatedCards);
router.get('/my-inventory', gameController.getMyCardInventory);

// TEST: Gatillar notificación de ganador
router.post('/test-winner-notification', gameController.testWinnerNotification);

// NUEVO: Obtener premios pendientes (ganados mientras estaba offline)
router.get('/pending-prizes', gameController.getPendingPrizes);

module.exports = router;
