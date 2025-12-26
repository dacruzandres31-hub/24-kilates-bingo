const express = require('express');
const cardsController = require('../controllers/cardsController');
const { authenticateToken, isAdmin, isSuperAdminOrAndy } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * CARD POOL ROUTES
 * Gestión del pool de cartones pre-generados
 */

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener cartones disponibles para seleccionar
router.get('/available/:room', cardsController.getAvailableCards);

// Obtener gift cards (yapas gratis) para paquetes
router.get('/gift-cards/:room/:quantity', cardsController.getGiftCards);

// Obtener estadísticas de cartones (pagos vs gratis) - Solo SuperAdmin (o Andy)
router.get('/stats', isSuperAdminOrAndy, cardsController.getCardStats);

// Reservar cartón temporalmente (al hacer click)
router.post('/reserve', cardsController.reserveCard);

// Liberar reserva de cartón (al deseleccionar)
router.post('/unreserve', cardsController.unreserveCard);

// Seleccionar cartones del pool (confirmar selección)
router.post('/select', cardsController.selectCards);

// Obtener mis cartones seleccionados
router.get('/my-selected/:room', cardsController.getMySelectedCards);

// Liberar cartones no usados
router.post('/release', cardsController.releaseCards);

module.exports = router;
