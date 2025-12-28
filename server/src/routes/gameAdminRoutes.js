const express = require('express');
const router = express.Router();
const gameAdminController = require('../controllers/gameAdminController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación (admin mínimo)
router.use(authenticateToken);

// Iniciar sorteo automático
router.post('/start', gameAdminController.startAutoGame);

// Sortear UNA bola manualmente (testing)
router.post('/draw-one', gameAdminController.drawOneBall);

// Detener sorteo
router.post('/stop', gameAdminController.stopAutoGame);

// Pausar/reanudar sorteo
router.post('/pause', gameAdminController.togglePause);

// Obtener estado de juegos activos
router.get('/status', gameAdminController.getGamesStatus);

module.exports = router;
