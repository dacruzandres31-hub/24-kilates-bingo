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

// ENDPOINTS PÚBLICOS (sin autenticación)
router.get('/lobby-data', roomSettingsController.getLobbyData);

// Sorteo en vivo - estado actual para jugadores que entran a mitad del sorteo
// PÚBLICO para que cualquiera pueda ver el sorteo en curso
router.get('/live-draw/:room', gameController.getLiveDraw);

// Historial de sesiones por sala - PÚBLICO para transparencia
// Muestra últimas sesiones con ganadores, bolas y cartones participantes
router.get('/history/:room', gameController.getSessionHistoryByRoom);

// Estado de ventas de una sala - PÚBLICO para habilitar/deshabilitar botón de compra
// Centralizado con schedule_settings
router.get('/sales-status/:room', gameController.getSalesStatus);

// Estado de sala - Devuelve ID de sesión activa para obtener cartones del usuario
router.get('/room-status/:room', authMiddleware.authenticateToken, gameController.getRoomStatus);

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

// Obtener cartones del jugador (solo sesiones activas)
router.get('/my-cards', gameController.getPlayerCards);

// Historial de cartones del jugador (sesiones completadas/archivadas)
router.get('/my-cards-history', gameController.getPlayerCardsHistory);

// Terminar sesión (admin/SuperAdmin)
router.post('/finish-session', gameController.finishSession);

// Estado de sesión específica
router.get('/sessions/:sessionId', gameController.getSessionStatus);

// Estado detallado de sesión (para jugadores y monitoreo)
router.get('/session-status/:sessionId', diagnosticsController.getSessionStatus);


// Sesiones activas
router.get('/sessions', gameController.getActiveSessions);

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

module.exports = router;
